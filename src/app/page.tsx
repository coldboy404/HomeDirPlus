import { Terminal } from "lucide-react";
import { GithubIcon } from "@/components/icons/github";
import { getSites } from "@/lib/sites";
import { HomePage } from "@/components/home-page";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { sites, categories, config, shortcuts } = getSites();
  const backgroundImage = config.background_image_url.trim();
  const backgroundBlur = Math.min(24, Math.max(0, Number(config.background_blur) || 0));
  const siteLogo = config.site_logo_url.trim();

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {backgroundImage && (
        <>
          <div
            className="fixed inset-0 -z-20 scale-[1.03] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImage})`, filter: `blur(${backgroundBlur}px)` }}
            aria-hidden="true"
          />
          <div className="fixed inset-0 -z-10 bg-background/80 backdrop-blur-[1px] dark:bg-background/75" aria-hidden="true" />
        </>
      )}
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pt-8 sm:px-6 lg:px-8">
        {/* 标题 — Server Component，0 JS */}
        <header className="mb-8 flex items-center gap-2.5">
          {siteLogo ? (
            <img src={siteLogo} alt="" className="size-5 rounded object-contain" />
          ) : (
            <Terminal className="size-5" />
          )}
          <span className="flex-1 text-sm font-semibold tracking-tight">{config.site_name}</span>
          <a href="https://github.com/coldboy404/HomeDirPlus" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/50 transition-colors hover:text-muted-foreground">
            <GithubIcon className="size-4" />
          </a>
        </header>

        {/* 交互区域 — Client Component */}
        <div className="flex-1">
          <HomePage sites={sites} categories={categories} shortcuts={shortcuts} />
        </div>

        {/* 底部 */}
        <footer className="mt-auto flex flex-col items-center gap-4 pb-4 pt-8">
          {config.footer_text && (
            <p className="text-[11px] text-muted-foreground/60 [&_a]:no-underline [&_a]:hover:text-muted-foreground" dangerouslySetInnerHTML={{ __html: config.footer_text }} />
          )}
        </footer>
      </div>
    </div>
  );
}
