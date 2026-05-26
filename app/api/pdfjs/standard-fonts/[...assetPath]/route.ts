import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ assetPath: string[] }> }) {
  const { assetPath } = await params;
  const basePath = path.resolve(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts');
  const filePath = path.resolve(basePath, ...assetPath);

  if (!filePath.startsWith(basePath + path.sep)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const buffer = await fs.readFile(filePath);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
