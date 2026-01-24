/**
 * CLI Render Script for Video Factory Integration
 *
 * Usage:
 *   npx ts-node scripts/render.ts --input props.json --output video.mp4 --composition ShortVideo
 *   npx ts-node scripts/render.ts --props '{"hook":"Hello!"}' --output video.mp4
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";

interface RenderOptions {
  input?: string; // JSON file path
  props?: string; // Inline JSON props
  output: string; // Output file path
  composition?: string; // Composition ID
  format?: "mp4" | "webm" | "gif";
  codec?: "h264" | "h265" | "vp8" | "vp9";
}

async function parseArgs(): Promise<RenderOptions> {
  const args = process.argv.slice(2);
  const options: RenderOptions = {
    output: "output.mp4",
    composition: "ShortVideo",
    format: "mp4",
    codec: "h264",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--input":
      case "-i":
        options.input = args[++i];
        break;
      case "--props":
      case "-p":
        options.props = args[++i];
        break;
      case "--output":
      case "-o":
        options.output = args[++i];
        break;
      case "--composition":
      case "-c":
        options.composition = args[++i];
        break;
      case "--format":
      case "-f":
        options.format = args[++i] as "mp4" | "webm" | "gif";
        break;
      case "--codec":
        options.codec = args[++i] as "h264" | "h265" | "vp8" | "vp9";
        break;
    }
  }

  return options;
}

async function getInputProps(options: RenderOptions): Promise<Record<string, unknown>> {
  if (options.input) {
    const content = fs.readFileSync(options.input, "utf-8");
    return JSON.parse(content);
  }

  if (options.props) {
    return JSON.parse(options.props);
  }

  // Check for stdin
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks).toString("utf-8");
    if (content.trim()) {
      return JSON.parse(content);
    }
  }

  return {};
}

async function main() {
  const options = await parseArgs();

  console.log("Remotion Video Renderer");
  console.log("=======================");
  console.log(`Composition: ${options.composition}`);
  console.log(`Output: ${options.output}`);
  console.log(`Format: ${options.format}`);

  // Get input props
  const inputProps = await getInputProps(options);
  console.log(`Props: ${JSON.stringify(inputProps).slice(0, 100)}...`);

  // Bundle the project
  console.log("\nBundling project...");
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, "../src/index.ts"),
    onProgress: (progress) => {
      if (progress % 10 === 0) {
        process.stdout.write(`\rBundle progress: ${progress}%`);
      }
    },
  });
  console.log("\nBundle complete!");

  // Select composition
  console.log(`\nSelecting composition: ${options.composition}`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: options.composition!,
    inputProps,
  });

  // Ensure output directory exists
  const outputDir = path.dirname(options.output);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Render
  console.log("\nRendering video...");
  const startTime = Date.now();

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: options.codec!,
    outputLocation: options.output,
    inputProps,
    onProgress: ({ progress }) => {
      const percent = Math.round(progress * 100);
      process.stdout.write(`\rRender progress: ${percent}%`);
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\nRender complete in ${elapsed}s!`);
  console.log(`Output: ${path.resolve(options.output)}`);

  // Output result as JSON for backend parsing
  console.log("\n---RESULT_JSON---");
  console.log(
    JSON.stringify({
      success: true,
      output: path.resolve(options.output),
      composition: options.composition,
      duration: elapsed,
    })
  );
}

main().catch((err) => {
  console.error("Render failed:", err.message);
  console.log("\n---RESULT_JSON---");
  console.log(
    JSON.stringify({
      success: false,
      error: err.message,
    })
  );
  process.exit(1);
});
