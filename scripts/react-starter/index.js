import * as p from "@clack/prompts";
import { execSync } from "node:child_process";

async function main() {
    // Step 1 Intro
    p.intro("Hello, I'm React Wizard");

    // Step 2 Select
    const result = await p.group(
        {
            // Step 2-1 Package manager
            packageManager: () =>
                p.select({
                    message: "選擇 package manager",
                    options: [
                        { value: "npm", label: "npm" },
                        { value: "pnpm", label: "pnpm" },
                    ],
                }),
            // Step 2-2 Npm Packages
            packages: () =>
                p.groupMultiselect({
                    message: "選擇套件 (Space 選取, Enter 送出)",
                    options: {
                        "State Management": [
                            { value: "zustand", label: "Zustand" },
                            { value: "jotai", label: "Jotai" },
                            { value: "@reduxjs/toolkit", label: "Redux Toolkit" },
                        ],
                        Routing: [
                            { value: "react-router", label: "React Router" },
                            { value: "@tanstack/react-router", label: "TanStack Router" },
                        ],
                        "Data Fetching": [
                            { value: "@tanstack/react-query", label: "TanStack Query" },
                            { value: "swr", label: "SWR" },
                            { value: "axios", label: "Axios" },
                        ],
                        Forms: [
                            { value: "react-hook-form", label: "React Hook Form" },
                            { value: "zod", label: "Zod (validation)" },
                        ],
                        UI: [
                            { value: "tailwindcss", label: "Tailwind CSS" },
                            { value: "@radix-ui/react-primitives", label: "Radix UI" },
                            { value: "framer-motion", label: "Framer Motion" },
                        ],
                        Utilities: [
                            { value: "clsx", label: "clsx" },
                            { value: "date-fns", label: "date-fns" },
                        ],
                    },
                    required: true,
                }),
            // Step 2-3 Confirm
            confirm: ({ results }) =>
                p.confirm({
                    message: `用 ${results.packageManager} 安裝 ${results.packages.length} 個套件？`,
                }),
        },
        {
            onCancel: () => {
                p.cancel("已取消");
                process.exit(0);
            },
        },
    );

    // Handle confirm = false
    if (!result.confirm) {
        p.cancel("已取消");
        process.exit(0);
    }

    // Step 3 Install
    const installCmd =
        result.packageManager === "pnpm"
            ? `pnpm add ${result.packages.join(" ")}`
            : `npm install ${result.packages.join(" ")}`;

    const s = p.spinner();
    s.start(`正在安裝：${result.packages.join(", ")}`);
    try {
        execSync(installCmd, { stdio: "ignore" });
        s.stop("安裝完成！");
    } catch {
        s.stop("安裝失敗");
        p.cancel("安裝過程發生錯誤");
        process.exit(1);
    }

    // Step 4 Outro
    p.outro("Thanks!!");
}

main();
