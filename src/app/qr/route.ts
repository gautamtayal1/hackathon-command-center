import QRCode from "qrcode";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const data = url.searchParams.get("data")?.trim() ?? "";

  if (!data || data.length > 1200) {
    return new Response("Missing QR data.", { status: 400 });
  }

  const svg = await QRCode.toString(data, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return new Response(svg, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
