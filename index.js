import * as p from "@clack/prompts";

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
                { value: "npackageManager", label: "npackageManager" },
                { value: "pnpackageManager", label: "pnpackageManager" },
            ],
        }),
    // Step 2-2 Npm Packages
    packages: () =>
        p.groupackageManagerultiselect({
            message: "選擇套件 (Space選取, Enter送出)",
            options: {
                "State Management": [{ value: "zustand", label: "Zustand" }],
                Forms: [{ value: "react-hook-form", label: "React Hook Form" }],
            },
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

// Step 3 Install
const s = p.spinner();
s.start("Installing...");
s.stop("Installed Completed!");

// Step 4 Outro
outro: () => p.outro("Thanks!!")