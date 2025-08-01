import withFlowbiteReact from 'flowbite-react/plugin/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins: ["127.0.0.1"],
    output: "standalone"
}

export default withFlowbiteReact(nextConfig);