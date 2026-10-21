import { SUPPORTED_LANGUAGES } from "@tango/shared";
import type { Metadata } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import "../globals.css";

import { LanguageProvider } from "@/lib/i18n/language-provider";
import { pageLanguage } from "@/lib/i18n/server";

// Next.js has no metrics for either font, so it can't build a size-matched
// fallback face; system fonts stand in until they load.
const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const googleSansCode = Google_Sans_Code({
  variable: "--font-google-sans-code",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: { default: "Tango", template: "%s | Tango" },
};

// Both languages are prerendered. The proxy rewrites every page request to
// /<lang>/..., so `[lang]` never appears in a visible URL.
export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const lang = await pageLanguage(params);
  return (
    <html
      lang={lang}
      className={`${googleSans.variable} ${googleSansCode.variable} h-full bg-gray-50 antialiased dark:bg-gray-900`}
    >
      <body className="h-full">
        <LanguageProvider lang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
