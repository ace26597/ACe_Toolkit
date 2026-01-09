from fastapi import APIRouter, HTTPException, Depends, Response
from playwright.async_api import async_playwright
import base64
from app.schemas import ExportRequest
from app.routers.auth import get_current_user
from app.models.models import User

router = APIRouter()

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'THEME_PLACEHOLDER' });
  </script>
  <style>
    body { margin: 0; padding: 0; background: white; }
    #container { display: inline-block; padding: 10px; }
  </style>
</head>
<body>
  <div id="container" class="mermaid">
    MERMAID_CODE_PLACEHOLDER
  </div>
</body>
</html>
"""

async def export_diagram(code: str, theme: str, format: str):
    html_content = HTML_TEMPLATE.replace("THEME_PLACEHOLDER", theme).replace("MERMAID_CODE_PLACEHOLDER", code)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()
        
        await page.set_content(html_content)
        # Wait for mermaid to render
        try:
            await page.wait_for_selector(".mermaid svg", timeout=5000)
        except:
            await browser.close()
            raise HTTPException(status_code=400, detail="Failed to render mermaid diagram")

        # Get the element handle to screenshot only the diagram
        element = await page.query_selector("#container")
        
        if format == "png":
            data = await element.screenshot(type="png")
            media_type = "image/png"
        elif format == "pdf":
            # PDF is full page usually, or we can try to fit
            data = await page.pdf(format="A4")
            media_type = "application/pdf"
        else:
            await browser.close()
            raise ValueError("Invalid format")

        await browser.close()
        return data, media_type

@router.post("/png")
async def export_png(req: ExportRequest, current_user: User = Depends(get_current_user)):
    try:
        data, media_type = await export_diagram(req.mermaid_code, req.theme, "png")
        return Response(content=data, media_type=media_type)
    except Exception as e:
        print(f"Export Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pdf")
async def export_pdf(req: ExportRequest, current_user: User = Depends(get_current_user)):
    try:
        data, media_type = await export_diagram(req.mermaid_code, req.theme, "pdf")
        return Response(content=data, media_type=media_type)
    except Exception as e:
        print(f"Export Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
