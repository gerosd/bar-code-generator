import { ThemeModeScript } from "flowbite-react";
import type { Metadata } from "next";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ClientProvider } from "@/components/providers/ClientProvider";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import {ToastContainer} from "@/components/ui/ToastContainer";
import {ToastProvider} from "@/components/providers/ToastProvider";

const roboto = Roboto({
    variable: "--font-roboto",
    subsets: ["cyrillic"],
});

const robotoMono = Roboto_Mono({
    variable: "--font-roboto-mono",
    subsets: ["cyrillic"],
});

export const metadata: Metadata = {
    title: "BarMatrix",
    description: "",
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
        <body className={`${roboto.variable} ${robotoMono.variable} antialiased bg-gray-900`}>
        <SessionProvider>
            <ToastProvider>
                <ClientProvider>
                    {children}
                    <ToastContainer/>
                </ClientProvider>
            </ToastProvider>
        </SessionProvider>
        </body>
        </html>
    );
};

export default RootLayout;
