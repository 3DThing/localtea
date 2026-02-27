import { NextRequest, NextResponse } from 'next/server';

const AI_BACKEND_URL = process.env.AI_ASSISTANT_URL || 'http://ai_assistant:8004';

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string,
) {
  const path = pathSegments.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${AI_BACKEND_URL}/api/v1/${path}${searchParams ? `?${searchParams}` : ''}`;

  const headers: Record<string, string> = {};
  
  const authorization = request.headers.get('authorization');
  const sessionId = request.headers.get('x-session-id');
  
  if (authorization) headers['Authorization'] = authorization;
  if (sessionId) headers['X-Session-ID'] = sessionId;

  const fetchOptions: RequestInit = { method, headers };

  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
    try {
      const body = await request.text();
      if (body) fetchOptions.body = body;
    } catch {}
  }

  try {
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[AI Proxy] Error proxying ${method} ${url}:`, error);
    return NextResponse.json(
      { detail: 'AI Assistant service unavailable' },
      { status: 503 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  return proxyRequest(request, pathSegments, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  return proxyRequest(request, pathSegments, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  return proxyRequest(request, pathSegments, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  return proxyRequest(request, pathSegments, 'DELETE');
}
