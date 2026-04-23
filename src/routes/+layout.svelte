<script lang="ts">
    import { Toaster } from "svelte-sonner";
	import favicon from '$lib/assets/favicon.svg';
	import "../app.css";
	import {
        BookOpen,
        LayoutDashboard,
        Library,
        Trophy,
        Info,
        LogOut,
        Bell,
    } from "@lucide/svelte";
    import { browser } from "$app/environment";
    import { goto, invalidateAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import { page } from "$app/state";
    import type { PublicUser } from "$lib/types";
    import { dicebearAvatarUrl, imgReferrerPolicy } from "$lib/avatarUrl";

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
			description: `You’re now level ${lu.to} (was level ${lu.from}).`,
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
        user ? (user.image?.trim() ? user.image : dicebearAvatarUrl(user.email)) : ""
    );

    // --- FUNCTIONS --- Navigate to the vocabulary page
    const handleMyCollectionClick = async() => {
        goto("/vocabulary");
    }
    // --- FUNCTIONS --- Navigate to the dashboard page
    const handleDashboardClick = async() => {
        goto("/dashboard");
    }
    // --- FUNCTIONS --- Get the button class based on the current path and change the CSS accordingly
    const getBtnClass = (path: string) => {
        const base = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer";
        const active = "bg-brand/15 text-brand border border-brand/30 shadow-inner";
        const inactive = "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent";
        
        return `${base} ${currentPath === path ? active : inactive}`;
    }

    const handleAboutClick = () => {
        goto("/about");
    }
    const handleProfileClick = () => {
        goto("/profile");
    }
    const handleProgressClick = () => {
        goto("/progress");
    }
    const handleNotificationsClick = () => {
        toast.info("Notifications", {
            description: "Inbox coming soon. You'll see reminders and progress updates here.",
        });
    }
</script>

<Toaster
	position="bottom-right"
	richColors
	closeButton
	expand
	gap={12}
	offset={20}
	duration={3500}
	toastOptions={{
		class: "bg-[#0f1423] border border-gray-800 text-gray-200 shadow-xl",
		descriptionClass: "text-gray-400",
	}}
/>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>VocabVault | Master Your Language</title>
</svelte:head>

	<nav
        class="flex items-center justify-between px-6 py-4 bg-[#0d1120] border-b border-gray-800"
    >
        <div class="flex items-center gap-2 cursor-pointer">
            <div class="p-1.5 bg-brand/20 text-brand rounded-md">
                <BookOpen size={20} strokeWidth={2.5} />
            </div>
            <span class="text-xl font-bold tracking-tight text-white">
                Vocab<span class="text-brand">Vault</span>
            </span>
        </div>

        <div class="hidden md:flex items-center gap-2">
            <button
                class={getBtnClass('/dashboard')}
                onclick={handleDashboardClick}
            >
                <LayoutDashboard size={18} />
                Dashboard
            </button>
            <button
                class={getBtnClass('/vocabulary')}
                onclick={handleMyCollectionClick}
            >
                <Library size={18} />
                My Collection
            </button>
            <button
                class={getBtnClass("/progress")}
                onclick={handleProgressClick}
            >
                <Trophy size={18} />
                Progress
            </button>
            <button
                class={getBtnClass('/about')}
                onclick={handleAboutClick}
            >
                <Info size={18} />
            </button>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
            {#if user}
                <button
                    type="button"
                    onclick={handleNotificationsClick}
                    class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                    title="Notifications"
                    aria-label="Open notifications (coming soon)"
                >
                    <Bell size={20} strokeWidth={2} />
                </button>
                <button
                    type="button"
                    onclick={handleProfileClick}
                    class="shrink-0 rounded-full border border-gray-700 bg-slate-800 overflow-hidden cursor-pointer p-0 leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                    title="Profile"
                >
                    <img
                        src={navAvatarSrc}
                        alt=""
                        width={40}
                        height={40}
                        referrerpolicy={imgReferrerPolicy}
                        class="w-10 h-10 object-cover block"
                        loading="eager"
                        decoding="async"
                    />
                </button>
                <form method="POST" action="/api/auth/logout">
                    <button
                        type="submit"
                        class="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-xs font-medium text-gray-300 hover:border-gray-500 hover:bg-gray-800/50 transition-colors cursor-pointer"
                        title="Sign out"
                    >
                        <LogOut size={16} />
                        <span class="hidden sm:inline">Sign out</span>
                    </button>
                </form>
            {:else}
                <img
                    src={dicebearAvatarUrl("guest")}
                    alt=""
                    width={40}
                    height={40}
                    referrerpolicy={imgReferrerPolicy}
                    class="w-10 h-10 rounded-full border border-gray-700 object-cover opacity-60 block bg-slate-800"
                    loading="lazy"
                    decoding="async"
                />
            {/if}
        </div>
    </nav>

{@render children()}

<footer class="text-center text-gray-500 text-sm bg-[#0d1120] border-b border-gray-800 py-4">
    © 2026 VocabVault. Built with care for language lovers ❤️
</footer>
