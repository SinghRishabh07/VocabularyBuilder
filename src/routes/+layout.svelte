<script lang="ts">
    import { Toaster } from "svelte-sonner";
    import favicon from "$lib/assets/favicon.svg";
    import "../app.css";
    import {
        BookOpen,
        Home,
        Library,
        Plus,
        Bell,
        User,
    } from "@lucide/svelte";
    import { browser } from "$app/environment";
    import { goto, invalidateAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import { page } from "$app/state";
    import type { PublicUser } from "$lib/types";
    import { dicebearAvatarUrl, imgReferrerPolicy } from "$lib/avatarUrl";
    import AppBottomNav from "$lib/components/AppBottomNav.svelte";

    let currentPath = $derived(page.url.pathname);
    let { data, children } = $props<{
        data: {
            user: PublicUser | null;
            levelUp: { from: number; to: number } | null;
        };
    }>();

    $effect(() => {
        if (!browser) return;
        const lu = data.levelUp;
        if (!lu) return;
        const k = `vocab-lu-seen-${lu.from}-${lu.to}`;
        if (sessionStorage.getItem(k)) return;
        sessionStorage.setItem(k, "1");
        void toast.success("Level up!", {
            description: `You're now level ${lu.to} (was level ${lu.from}).`,
        });
        void fetch("/api/user/dismiss-level-up", { method: "POST" }).then((r) => {
            if (r.ok) {
                return void invalidateAll();
            }
            sessionStorage.removeItem(k);
        });
    });

    let user = $derived(data.user);
    let navAvatarSrc = $derived(
        user ? (user.image?.trim() ? user.image : dicebearAvatarUrl(user.email)) : "",
    );

    let isLanding = $derived(currentPath === "/");
    let showAppChrome = $derived(Boolean(user) && !isLanding);
    /** Full-bleed auth-focused shell: no redundant top “Sign in” on the login screen */
    let hidePublicChrome = $derived(isLanding && !user);

    function topLinkClass(href: string) {
        const active = currentPath === href;
        const base =
            "rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-200";
        return active
            ? `${base} text-brand bg-brand/10`
            : `${base} text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]`;
    }

    function logoHref() {
        return user ? "/dashboard" : "/";
    }

    function handleNotificationsClick() {
        toast.info("Notifications", {
            description:
                "Inbox coming soon. You'll see reminders and progress updates here.",
        });
    }

    function goFocusSearch() {
        void goto("/dashboard?focus=search");
    }
</script>

<Toaster
    position="top-center"
    richColors
    closeButton
    expand
    gap={12}
    offset={16}
    duration={3500}
    toastOptions={{
        class: "bg-[#0c1018] border border-white/10 text-gray-200 shadow-lg",
        descriptionClass: "text-gray-400",
    }}
/>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>VocabVault | Master Your Language</title>
</svelte:head>

{#if showAppChrome}
    <header
        class="sticky top-0 z-50 flex items-center justify-between gap-2 border-b border-white/[0.06] bg-[#070a10]/90 px-3 py-2 backdrop-blur-xl pt-[max(0.5rem,env(safe-area-inset-top))] lg:gap-3 lg:px-6 lg:py-2.5"
    >
        <a
            href={logoHref()}
            class="flex shrink-0 items-center justify-center rounded-lg bg-brand/10 p-2 text-brand transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            aria-label={user ? "Go to home" : "VocabVault home"}
        >
            <BookOpen size={20} strokeWidth={2.25} aria-hidden="true" />
        </a>

        <nav
            class="hidden lg:flex flex-1 items-center justify-center gap-0.5 min-w-0"
            aria-label="Sections"
        >
            <a href="/dashboard" class={topLinkClass("/dashboard")}>
                <span class="inline-flex items-center gap-1.5">
                    <Home size={14} strokeWidth={2} aria-hidden="true" />
                    Home
                </span>
            </a>
            <a href="/vocabulary" class={topLinkClass("/vocabulary")}>
                <span class="inline-flex items-center gap-1.5">
                    <Library size={14} strokeWidth={2} aria-hidden="true" />
                    Collection
                </span>
            </a>
            <button
                type="button"
                onclick={goFocusSearch}
                class={`${topLinkClass("")} inline-flex items-center gap-1.5 border-0 bg-transparent cursor-pointer font-[inherit]`}
            >
                <Plus size={14} strokeWidth={2} aria-hidden="true" />
                Add Word
            </button>
            <button
                type="button"
                onclick={handleNotificationsClick}
                class={`${topLinkClass("")} inline-flex items-center gap-1.5 border-0 bg-transparent cursor-pointer font-[inherit]`}
                aria-label="Notifications (coming soon)"
            >
                <Bell size={14} strokeWidth={2} aria-hidden="true" />
                Notifications
            </button>
            <a href="/profile" class={topLinkClass("/profile")}>
                <span class="inline-flex items-center gap-1.5">
                    <User size={14} strokeWidth={2} aria-hidden="true" />
                    Profile
                </span>
            </a>
        </nav>

        <a
            href="/profile"
            class="hidden lg:flex shrink-0 items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            aria-label="Open profile"
        >
            <img
                src={navAvatarSrc}
                alt=""
                width={34}
                height={34}
                referrerpolicy={imgReferrerPolicy}
                class="h-[34px] w-[34px] rounded-full border border-white/10 object-cover"
                loading="eager"
                decoding="async"
            />
        </a>
    </header>
{:else if !hidePublicChrome}
    <header
        class="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#070a10]/90 px-4 py-2.5 backdrop-blur-xl pt-[max(0.625rem,env(safe-area-inset-top))]"
    >
        <a
            href="/"
            class="flex shrink-0 items-center justify-center rounded-lg bg-brand/10 p-2 text-brand transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            aria-label="VocabVault home"
        >
            <BookOpen size={20} strokeWidth={2.25} aria-hidden="true" />
        </a>
        {#if !user}
            <a
                href="/api/auth/google"
                class="text-[13px] font-medium text-brand hover:text-brand-bright transition-colors"
            >
                Sign in
            </a>
        {:else}
            <a
                href="/dashboard"
                class="text-[13px] font-medium text-brand hover:text-brand-bright transition-colors"
            >
                Open app
            </a>
        {/if}
    </header>
{/if}

<div
    class={`${hidePublicChrome ? "min-h-dvh" : "min-h-[calc(100dvh-3.25rem)]"} ${showAppChrome ? "pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0" : ""}`}
>
    {@render children()}
</div>

{#if showAppChrome}
    <AppBottomNav />
{/if}

{#if !showAppChrome && !hidePublicChrome}
    <footer class="border-t border-white/[0.06] bg-[#070a10] py-4 text-center text-[13px] text-gray-500">
        © 2026 VocabVault. Built with care for language lovers.
    </footer>
{/if}
