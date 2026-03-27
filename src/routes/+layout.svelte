<script lang="ts">
    import { Toaster } from "svelte-sonner";
	import favicon from '$lib/assets/favicon.svg';
	import "../app.css";
	import {
        BookOpen,
        LayoutDashboard,
        Library,
        Trophy,
        Info
    } from "@lucide/svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";

    let currentPath = $derived(page.url.pathname);
	let { children } = $props();

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
        const active = "bg-rose-900/20 text-rose-400 border border-rose-900/30 shadow-inner";
        const inactive = "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent";
        
        return `${base} ${currentPath === path ? active : inactive}`;
    }

    const handleAboutClick = () => {
        goto("/about");
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

<svelte>
	<nav
        class="flex items-center justify-between px-6 py-4 bg-[#0d1120] border-b border-gray-800"
    >
        <div class="flex items-center gap-2 cursor-pointer">
            <div class="p-1.5 bg-rose-900/30 text-rose-500 rounded-md">
                <BookOpen size={20} strokeWidth={2.5} />
            </div>
            <span class="text-xl font-bold tracking-tight text-white">
                Vocab<span class="text-rose-500">Vault</span>
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
                class="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg text-sm font-medium transition-colors"
                title="Coming Soon -- Work in Progress"
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

        <div>
            <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=475569"
                alt="User Avatar"
                class="w-10 h-10 rounded-full border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors"
                title="Coming Soon-- Work in Progress"
            />
        </div>
    </nav>
</svelte>

{@render children()}

<footer class="text-center text-gray-500 text-sm bg-[#0d1120] border-b border-gray-800 py-4">
    © 2026 VocabVault. Built with care for language lovers ❤️
</footer>
