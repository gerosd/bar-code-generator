import { ThemeModeScript } from "flowbite-react";
import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
    variable: "--font-roboto",
    subsets: ["cyrillic"],
});

const robotoMono = Roboto_Mono({
    variable: "--font-roboto-mono",
    subsets: ["cyrillic"],
});

export const metadata: Metadata = {
    title: "",
    description:
        "",
};

const RootLayout = ({
                        children,
                    }: Readonly<{
    children: React.ReactNode;
}>) => {
    return (
        <html lang="ru" suppressHydrationWarning>
        <head>
            <ThemeModeScript />
        </head>
        <body className={`${roboto.variable} ${robotoMono.variable} antialiased`}>
        {children}
        </body>
        </html>
    );
};

export default RootLayout;
