<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import "../app.css";
	import {
        BookOpen,
        LayoutDashboard,
        Library,
        Trophy,
        Info
    } from "@lucide/svelte";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<nav
        class="flex items-center justify-between px-6 py-4 bg-[#0d1120] border-b border-gray-800"
    >
        <div class="flex items-center gap-2 cursor-pointer">
            <div class="p-1.5 bg-rose-900/30 text-rose-500 rounded-md">
                <BookOpen size={20} strokeWidth={2.5} />
            </div>
            <span class="text-xl font-bold tracking-tight text-white">
                Vocab<span class="text-rose-500">Builder</span>
            </span>
        </div>

        <div class="hidden md:flex items-center gap-2">
            <button
                class="flex items-center gap-2 px-4 py-2 bg-rose-900/20 text-rose-400 rounded-lg text-sm font-medium transition-colors"
            >
                <LayoutDashboard size={18} />
                Dashboard
            </button>
            <button
                class="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg text-sm font-medium transition-colors"
            >
                <Library size={18} />
                My Collection
            </button>
            <button
                class="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg text-sm font-medium transition-colors"
            >
                <Trophy size={18} />
                Progress
            </button>
            <button
                class="flex items-center justify-center p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-full transition-colors"
            >
                <Info size={18} />
            </button>
        </div>

        <div>
            <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=475569"
                alt="User Avatar"
                class="w-10 h-10 rounded-full border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors"
            />
        </div>
    </nav>
</svelte:head>

{@render children()}


<!-- // Add a footer component here -->