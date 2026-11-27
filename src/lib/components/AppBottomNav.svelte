<script lang="ts">
    import { Home, Library, Plus, Brain, User } from "@lucide/svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";

    let path = $derived(page.url.pathname);

    function isHome() {
        return path === "/dashboard";
    }

    function isCollection() {
        return path === "/vocabulary";
    }

    function isRevise() {
        return path === "/revise";
    }

    function isProfile() {
        return path === "/profile";
    }

    function navItemClass(active: boolean) {
        const base =
            "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 min-w-0 touch-manipulation transition-colors duration-200";
        return active
            ? `${base} text-brand`
            : `${base} text-gray-500 active:text-gray-300`;
    }

    function labelClass(active: boolean) {
        return `text-[10px] font-medium truncate max-w-full leading-tight ${
            active ? "text-brand" : "text-gray-500"
        }`;
    }

    function goHome() {
        void goto("/dashboard");
    }

    function goCollection() {
        void goto("/vocabulary");
    }

    function goAdd() {
        void goto("/dashboard?focus=search");
    }

    function goRevise() {
        void goto("/revise");
    }

    function goProfile() {
        void goto("/profile");
    }
</script>

<nav
    class="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.06] bg-[#080b11]/92 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    aria-label="Primary"
>
    <div class="mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1">
        <button
            type="button"
            onclick={goHome}
            class={navItemClass(isHome())}
            aria-current={isHome() ? "page" : undefined}
        >
            <Home size={22} strokeWidth={isHome() ? 2.25 : 2} aria-hidden="true" />
            <span class={labelClass(isHome())}>Home</span>
        </button>

        <button
            type="button"
            onclick={goCollection}
            class={navItemClass(isCollection())}
            aria-current={isCollection() ? "page" : undefined}
        >
            <Library size={22} strokeWidth={isCollection() ? 2.25 : 2} aria-hidden="true" />
            <span class={labelClass(isCollection())}>Collection</span>
        </button>

        <button
            type="button"
            onclick={goAdd}
            class={navItemClass(false)}
            aria-label="Add word — opens lookup"
        >
            <Plus size={22} strokeWidth={2} class="text-brand" aria-hidden="true" />
            <span class={labelClass(false)}>Add Word</span>
        </button>

        <button
            type="button"
            onclick={goRevise}
            class={navItemClass(isRevise())}
            aria-current={isRevise() ? "page" : undefined}
        >
            <Brain size={22} strokeWidth={isRevise() ? 2.25 : 2} aria-hidden="true" />
            <span class={labelClass(isRevise())}>Revise</span>
        </button>

        <button
            type="button"
            onclick={goProfile}
            class={navItemClass(isProfile())}
            aria-current={isProfile() ? "page" : undefined}
        >
            <User size={22} strokeWidth={isProfile() ? 2.25 : 2} aria-hidden="true" />
            <span class={labelClass(isProfile())}>Profile</span>
        </button>
    </div>
</nav>
