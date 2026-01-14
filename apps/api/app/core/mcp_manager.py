"""
MCP Connection Manager for Scientific Skills

Manages connection to K-Dense hosted MCP server, including:
- Connecting/disconnecting from hosted MCP server
- Executing skills via MCP protocol over stdio with remote backend
- Skill discovery from remote server
- Session management
"""

import asyncio
import logging
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path

# MCP Protocol imports
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.session import ClientSession
from mcp import types as mcp_types

logger = logging.getLogger("mcp_manager")


class MCPManager:
    """Manages connection to K-Dense hosted MCP server for scientific skills"""

    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.available_skills: List[Dict[str, Any]] = []
        self.start_time: Optional[datetime] = None
        self.execution_count = 0
        self._read_stream = None
        self._write_stream = None
        self._stdio_context = None
        self.remote_backend_url = "https://skills.k-dense.ai/mcp"  # K-Dense hosted backend

    async def start(self) -> bool:
        """Connect to K-Dense hosted MCP server using stdio with remote backend"""
        if self.is_running():
            logger.info("MCP connection is already established")
            return True

        try:
            logger.info(f"Connecting to K-Dense MCP server at {self.remote_backend_url}...")

            # Create stdio server parameters with uvx command pointing to remote backend
            server_params = StdioServerParameters(
                command="uvx",
                args=["claude-skills-mcp", "--remote", self.remote_backend_url],
                env=None
            )

            # Create stdio client connection
            # Note: We store the context manager to keep streams alive
            self._stdio_context = stdio_client(server_params)
            self._read_stream, self._write_stream = await self._stdio_context.__aenter__()

            # Create MCP session
            self.session = ClientSession(self._read_stream, self._write_stream)

            # Initialize session (performs handshake with MCP server)
            logger.info("Initializing MCP session with hosted server...")
            try:
                await asyncio.wait_for(
                    self.session.initialize(),
                    timeout=30  # 30 second timeout for remote connection
                )
            except asyncio.TimeoutError:
                logger.error("MCP session initialization timed out after 30 seconds")
                raise Exception("MCP session initialization timeout")

            # Set start time for uptime tracking
            self.start_time = datetime.now()

            logger.info("✅ MCP session connected successfully to K-Dense hosted server")

            # Discover available skills from MCP server
            logger.info("Discovering skills from remote server...")
            await self._discover_skills()

            logger.info(f"✅ MCP connected with {len(self.available_skills)} skills available")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to K-Dense MCP server: {e}", exc_info=True)
            # Cleanup on failure
            if self.session:
                try:
                    await self.session.close()
                except:
                    pass
                self.session = None

            if self._stdio_context:
                try:
                    await self._stdio_context.__aexit__(None, None, None)
                except:
                    pass
                self._stdio_context = None

            return False

    async def stop(self) -> bool:
        """Disconnect from K-Dense MCP server and close session"""
        if not self.is_running():
            logger.info("MCP connection is not active")
            return True

        try:
            logger.info("Disconnecting from K-Dense MCP server...")

            # Close MCP session gracefully
            if self.session:
                try:
                    await self.session.close()
                except Exception as e:
                    logger.warning(f"Error closing MCP session: {e}")

            # Exit stdio context manager
            if self._stdio_context:
                try:
                    await self._stdio_context.__aexit__(None, None, None)
                except Exception as e:
                    logger.warning(f"Error closing stdio context: {e}")

            # Cleanup references
            self.session = None
            self._stdio_context = None
            self.start_time = None
            self._read_stream = None
            self._write_stream = None

            logger.info("MCP server stopped successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to stop MCP server: {e}")
            return False

    async def restart(self) -> bool:
        """Restart the MCP server"""
        logger.info("Restarting MCP server...")
        await self.stop()
        await asyncio.sleep(1)
        return await self.start()

    def is_running(self) -> bool:
        """Check if MCP server session is active"""
        return self.session is not None

    async def execute_skill(
        self,
        skill_name: str,
        params: Optional[Dict[str, Any]] = None,
        timeout: int = 60
    ) -> Dict[str, Any]:
        """
        Execute a skill via MCP protocol using session.call_tool()

        Args:
            skill_name: Name of the skill/tool to execute
            params: Parameters to pass to the tool
            timeout: Timeout in seconds (default: 60)

        Returns:
            Dict with execution results:
            {
                "success": bool,
                "output": str,
                "error": str (if failed),
                "execution_time_ms": int
            }
        """
        if not self.is_running():
            return {
                "success": False,
                "error": "MCP server is not running",
                "output": None,
                "execution_time_ms": 0
            }

        start_time = time.time()

        try:
            # Call tool via MCP protocol
            result = await asyncio.wait_for(
                self.session.call_tool(skill_name, params or {}),
                timeout=timeout
            )

            execution_time = int((time.time() - start_time) * 1000)
            self.execution_count += 1

            # Parse result based on MCP CallToolResult format
            # result.content contains array of TextContent or ImageContent or EmbeddedResource
            output_parts = []

            if hasattr(result, 'content') and result.content:
                for content in result.content:
                    if hasattr(content, 'text'):
                        # TextContent
                        output_parts.append(content.text)
                    elif hasattr(content, 'data'):
                        # ImageContent or binary data
                        if hasattr(content, 'mimeType'):
                            output_parts.append(f"[Binary data: {content.mimeType}, {len(content.data)} bytes]")
                        else:
                            output_parts.append(f"[Binary data: {len(content.data)} bytes]")
                    else:
                        # Unknown content type
                        output_parts.append(str(content))

            output = "\n".join(output_parts) if output_parts else "(no output)"

            return {
                "success": True,
                "output": output,
                "error": None,
                "execution_time_ms": execution_time
            }

        except asyncio.TimeoutError:
            execution_time = int((time.time() - start_time) * 1000)
            return {
                "success": False,
                "output": None,
                "error": f"Skill execution timed out after {timeout}s",
                "execution_time_ms": execution_time
            }
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            logger.error(f"Skill execution failed for '{skill_name}': {e}", exc_info=True)
            return {
                "success": False,
                "output": None,
                "error": str(e),
                "execution_time_ms": execution_time
            }

    # Process monitoring methods not needed for hosted connection
    # Memory management is handled by K-Dense infrastructure

    async def check_memory(self) -> Dict[str, Any]:
        """
        Memory check not applicable for hosted server

        Returns:
            Dict with connection status
        """
        return {
            "running": self.is_running(),
            "memory_mb": 0,  # N/A for hosted connection
            "restart_triggered": False,
            "hosted": True
        }

    def get_status(self) -> Dict[str, Any]:
        """
        Get current MCP connection status

        Returns:
            Dict with status information including connection state, uptime, skills count
        """
        status = {
            "running": self.is_running(),
            "connection_type": "hosted",
            "server_url": self.remote_backend_url,
            "uptime_seconds": 0,
            "skills_count": len(self.available_skills),
            "execution_count": self.execution_count
        }

        if self.is_running() and self.start_time:
            uptime = (datetime.now() - self.start_time).total_seconds()
            status["uptime_seconds"] = int(uptime)

        return status

    def _categorize_skill(self, skill_name: str) -> str:
        """
        Categorize skill based on name patterns

        Args:
            skill_name: Name of the skill

        Returns:
            Category string
        """
        name_lower = skill_name.lower()

        # Database skills
        if any(db in name_lower for db in [
            'pubmed', 'uniprot', 'chembl', 'drugbank', 'cosmic',
            'clinvar', 'ensembl', 'pdb', 'genbank', 'kegg'
        ]):
            return 'databases'

        # Python package skills
        elif any(lib in name_lower for lib in [
            'rdkit', 'scanpy', 'pytorch', 'sklearn', 'numpy',
            'pandas', 'scipy', 'matplotlib', 'seaborn', 'biopython'
        ]):
            return 'python_packages'

        # Visualization skills
        elif any(word in name_lower for word in [
            'plot', 'graph', 'visualize', 'chart', 'display', 'render'
        ]):
            return 'visualization'

        # Bioinformatics skills
        elif any(word in name_lower for word in [
            'sequence', 'align', 'protein', 'dna', 'rna', 'gene',
            'genome', 'blast', 'fasta', 'phylo'
        ]):
            return 'bioinformatics'

        # Chemistry skills
        elif any(word in name_lower for word in [
            'molecule', 'compound', 'reaction', 'smiles', 'inchi',
            'chemical', 'bond', 'structure'
        ]):
            return 'chemistry'

        # Machine learning skills
        elif any(word in name_lower for word in [
            'train', 'model', 'predict', 'classify', 'cluster', 'neural'
        ]):
            return 'machine_learning'

        # General/other
        else:
            return 'general'

    async def _fetch_more_skills(self, cursor: str):
        """
        Handle pagination for skill discovery

        Args:
            cursor: Pagination cursor from previous result
        """
        try:
            # Query next page of skills
            result = await self.session.list_tools(cursor=cursor)

            # Parse additional skills
            for tool in result.tools:
                # Extract parameter schema from inputSchema
                parameters = {}
                if tool.inputSchema and "properties" in tool.inputSchema:
                    for param_name, param_schema in tool.inputSchema["properties"].items():
                        param_type = param_schema.get("type", "any")
                        parameters[param_name] = param_type

                # Categorize skill
                category = self._categorize_skill(tool.name)

                skill = {
                    "name": tool.name,
                    "category": category,
                    "description": tool.description or f"Execute {tool.name}",
                    "parameters": parameters
                }
                self.available_skills.append(skill)

            # Recursive call if more pages exist
            if hasattr(result, 'nextCursor') and result.nextCursor:
                await self._fetch_more_skills(result.nextCursor)

        except Exception as e:
            logger.warning(f"Failed to fetch additional skills page: {e}")

    async def _discover_skills(self):
        """
        Auto-discover available skills from MCP server using list_tools()

        Queries the MCP server via JSON-RPC protocol to get all available tools/skills,
        including metadata like name, description, and parameter schemas.
        """
        logger.info("Discovering available skills from MCP server...")

        try:
            # Query MCP server for tools/skills via protocol
            result = await self.session.list_tools()

            # Parse tools into our skill format
            self.available_skills = []

            for tool in result.tools:
                # Extract parameter schema from inputSchema
                parameters = {}
                if tool.inputSchema and "properties" in tool.inputSchema:
                    for param_name, param_schema in tool.inputSchema["properties"].items():
                        param_type = param_schema.get("type", "any")
                        parameters[param_name] = param_type

                # Categorize skill based on name patterns
                category = self._categorize_skill(tool.name)

                skill = {
                    "name": tool.name,
                    "category": category,
                    "description": tool.description or f"Execute {tool.name}",
                    "parameters": parameters
                }
                self.available_skills.append(skill)

            # Handle pagination if more skills exist
            if hasattr(result, 'nextCursor') and result.nextCursor:
                await self._fetch_more_skills(result.nextCursor)

            logger.info(f"Successfully discovered {len(self.available_skills)} skills from MCP server")

        except Exception as e:
            logger.error(f"Failed to discover skills: {e}", exc_info=True)
            # Fallback to empty list on error, don't crash
            self.available_skills = []
            logger.warning("Skill discovery failed, starting with empty skills list")

    def get_skills_list(self) -> List[Dict[str, Any]]:
        """Get list of all available skills"""
        return self.available_skills

    def get_claude_tools_schema(self) -> List[Dict[str, Any]]:
        """
        Convert MCP tools to Anthropic Claude tool schema format

        Transforms the internal MCP skills list into the format expected by
        Anthropic's Messages API for tool/function calling.

        Returns:
            List of tool schemas compatible with Claude API
        """
        tools = []

        for skill in self.available_skills:
            # Build input schema from MCP parameters
            input_schema = {
                "type": "object",
                "properties": {},
                "required": []
            }

            # Convert MCP parameter types to JSON schema types
            for param_name, param_type in skill.get("parameters", {}).items():
                # Map Python/MCP types to JSON schema types
                json_type_map = {
                    "int": "integer",
                    "integer": "integer",
                    "float": "number",
                    "number": "number",
                    "bool": "boolean",
                    "boolean": "boolean",
                    "list": "array",
                    "array": "array",
                    "dict": "object",
                    "object": "object",
                    "str": "string",
                    "string": "string"
                }

                json_type = json_type_map.get(param_type.lower() if isinstance(param_type, str) else "string", "string")

                input_schema["properties"][param_name] = {
                    "type": json_type,
                    "description": f"{param_name} parameter for {skill['name']}"
                }

            # Build Claude tool schema
            tools.append({
                "name": skill["name"],
                "description": skill["description"],
                "input_schema": input_schema
            })

        logger.info(f"Converted {len(tools)} MCP skills to Claude tool schema")
        return tools


# Global instance
mcp_manager = MCPManager()
