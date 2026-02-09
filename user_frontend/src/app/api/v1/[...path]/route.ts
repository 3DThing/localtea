import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_HOST 
  ? `https://${process.env.BACKEND_HOST}`
  : 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const path = pathSegments.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/api/v1/${path}${searchParams ? `?${searchParams}` : ''}`;

  try {
    // Собираем cookies из входящего запроса
    const cookieString = request.cookies
      .getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
    
    const authorization = request.headers.get('authorization');
    const csrfToken = request.headers.get('x-csrf-token');
    const sessionId = request.headers.get('x-session-id');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (cookieString) {
      headers['Cookie'] = cookieString;
    }
    if (authorization) {
      headers['Authorization'] = authorization;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    // Проверяем content-type перед парсингом JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Создаем ответ
    const nextResponse = NextResponse.json(data, { status: response.status });

    // Пробрасываем X-Session-ID (нужно для анонимной корзины/оформления заказа)
    const responseSessionId = response.headers.get('x-session-id');
    if (responseSessionId) {
      nextResponse.headers.set('X-Session-ID', responseSessionId);
    }
    
    // Пробрасываем cookies от бэкенда к клиенту
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    setCookieHeaders.forEach(cookie => {
      const [nameValue, ...attributes] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      nextResponse.cookies.set(name.trim(), value.trim(), {
        httpOnly: attributes.some(attr => attr.trim().toLowerCase() === 'httponly'),
        secure: attributes.some(attr => attr.trim().toLowerCase() === 'secure'),
        sameSite: 'lax',
      });
    });
    
    return nextResponse;
  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from backend', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const path = pathSegments.join('/');
  const url = `${BACKEND_URL}/api/v1/${path}`;

  try {
    // Проверяем тип контента
    const contentType = request.headers.get('content-type');
    let body;
    let headers: Record<string, string> = {};
    
    // Собираем cookies
    const cookieString = request.cookies
      .getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
    
    const authorization = request.headers.get('authorization');
    const csrfToken = request.headers.get('x-csrf-token');
    const sessionId = request.headers.get('x-session-id');
    
    if (cookieString) {
      headers['Cookie'] = cookieString;
    }
    if (authorization) {
      headers['Authorization'] = authorization;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }
    
    // Обрабатываем multipart/form-data (для загрузки файлов)
    if (contentType?.includes('multipart/form-data')) {
      // Получаем FormData из запроса и передаём напрямую
      const formData = await request.formData();
      body = formData;
      // НЕ устанавливаем Content-Type - fetch сделает это автоматически с правильным boundary
    } else if (contentType?.includes('application/json')) {
      // Обрабатываем JSON
      const text = await request.text();
      if (text) {
        body = text;
        headers['Content-Type'] = 'application/json';
      }
    } else {
      // По умолчанию JSON
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      ...(body && { body }),
    });

    const contentTypeResponse = response.headers.get('content-type');
    const data = contentTypeResponse?.includes('application/json') ? await response.json() : await response.text();
    
    // Создаем ответ
    const nextResponse = NextResponse.json(data, { status: response.status });

    const responseSessionId = response.headers.get('x-session-id');
    if (responseSessionId) {
      nextResponse.headers.set('X-Session-ID', responseSessionId);
    }
    
    // Пробрасываем cookies от бэкенда к клиенту
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    setCookieHeaders.forEach(cookie => {
      const [nameValue, ...attributes] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      nextResponse.cookies.set(name.trim(), value.trim(), {
        httpOnly: attributes.some(attr => attr.trim().toLowerCase() === 'httponly'),
        secure: attributes.some(attr => attr.trim().toLowerCase() === 'secure'),
        sameSite: 'lax',
      });
    });
    
    return nextResponse;
  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from backend' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const path = pathSegments.join('/');
  const url = `${BACKEND_URL}/api/v1/${path}`;

  try {
    const body = await request.json();
    
    // Собираем cookies правильно
    const cookieString = request.cookies
      .getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
    
    const authorization = request.headers.get('authorization');
    const csrfToken = request.headers.get('x-csrf-token');
    const sessionId = request.headers.get('x-session-id');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (cookieString) {
      headers['Cookie'] = cookieString;
    }
    if (authorization) {
      headers['Authorization'] = authorization;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    const contentTypeResponse = response.headers.get('content-type');
    const data = contentTypeResponse?.includes('application/json') ? await response.json() : await response.text();
    
    const nextResponse = NextResponse.json(data, { status: response.status });

    const responseSessionId = response.headers.get('x-session-id');
    if (responseSessionId) {
      nextResponse.headers.set('X-Session-ID', responseSessionId);
    }
    
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    setCookieHeaders.forEach(cookie => {
      const [nameValue, ...attributes] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      nextResponse.cookies.set(name.trim(), value.trim(), {
        httpOnly: attributes.some(attr => attr.trim().toLowerCase() === 'httponly'),
        secure: attributes.some(attr => attr.trim().toLowerCase() === 'secure'),
        sameSite: 'lax',
      });
    });
    
    return nextResponse;
  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from backend' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const path = pathSegments.join('/');
  const url = `${BACKEND_URL}/api/v1/${path}`;

  try {
    // Собираем cookies правильно
    const cookieString = request.cookies
      .getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
    
    const authorization = request.headers.get('authorization');
    const csrfToken = request.headers.get('x-csrf-token');
    const sessionId = request.headers.get('x-session-id');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (cookieString) {
      headers['Cookie'] = cookieString;
    }
    if (authorization) {
      headers['Authorization'] = authorization;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    const contentTypeResponse = response.headers.get('content-type');
    const data = contentTypeResponse?.includes('application/json') ? await response.json() : await response.text();
    
    const nextResponse = NextResponse.json(data, { status: response.status });

    const responseSessionId = response.headers.get('x-session-id');
    if (responseSessionId) {
      nextResponse.headers.set('X-Session-ID', responseSessionId);
    }
    
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    setCookieHeaders.forEach(cookie => {
      const [nameValue, ...attributes] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      nextResponse.cookies.set(name.trim(), value.trim(), {
        httpOnly: attributes.some(attr => attr.trim().toLowerCase() === 'httponly'),
        secure: attributes.some(attr => attr.trim().toLowerCase() === 'secure'),
        sameSite: 'lax',
      });
    });
    
    return nextResponse;
  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from backend' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const path = pathSegments.join('/');
  const url = `${BACKEND_URL}/api/v1/${path}`;

  try {
    const body = await request.text();

    const cookieString = request.cookies
      .getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

    const authorization = request.headers.get('authorization');
    const csrfToken = request.headers.get('x-csrf-token');
    const sessionId = request.headers.get('x-session-id');

    const headers: Record<string, string> = {
      'Content-Type': request.headers.get('content-type') || 'application/json',
    };

    if (cookieString) {
      headers['Cookie'] = cookieString;
    }
    if (authorization) {
      headers['Authorization'] = authorization;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      ...(body && { body }),
    });

    const contentTypeResponse = response.headers.get('content-type');
    const data = contentTypeResponse?.includes('application/json') ? await response.json() : await response.text();

    const nextResponse = NextResponse.json(data, { status: response.status });

    const responseSessionId = response.headers.get('x-session-id');
    if (responseSessionId) {
      nextResponse.headers.set('X-Session-ID', responseSessionId);
    }

    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    setCookieHeaders.forEach(cookie => {
      const [nameValue, ...attributes] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      nextResponse.cookies.set(name.trim(), value.trim(), {
        httpOnly: attributes.some(attr => attr.trim().toLowerCase() === 'httponly'),
        secure: attributes.some(attr => attr.trim().toLowerCase() === 'secure'),
        sameSite: 'lax',
      });
    });

    return nextResponse;
  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from backend' },
      { status: 500 }
    );
  }
}
