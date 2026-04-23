<script lang="ts">
    import { onMount } from "svelte";
    import { BookOpen, Eye, EyeOff } from "@lucide/svelte";
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";

    // Local state for UI interaction
    let showPassword = $state(false);
    let isLoading = $state(false);

    onMount(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("login") !== "required") return;

        toast.info("Sign in required", {
            description:
                "That page is only available when you are logged in. Use Continue with Google to access your dashboard and vocabulary.",
        });

        params.delete("login");
        const next =
            window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
        void goto(next, { replaceState: true, noScroll: true });
    });

    const handleSignIn = async (e: Event) => {
        e.preventDefault(); // Prevent the default form submission reload
        isLoading = true;

        // Mock a slight network delay so the button interaction feels real
        setTimeout(() => {
            // Redirect the user to the new dashboard route
            goto("/dashboard");
        }, 600);
    };

    const handleGoogleSignIn = async () => {
        goto("/api/auth/google");
    }
</script>

<div class="min-h-screen bg-[#0a0e17] text-gray-100 font-sans flex items-center justify-center p-6 selection:bg-brand-darker/40 selection:text-white">
    <div class="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        
        <div class="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div class="w-20 h-20 bg-[#12182b] border border-gray-800/60 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-black/20">
                <BookOpen size={40} class="text-brand" />
            </div>

            <h1 class="text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
                Vocab<span class="text-brand">Vault</span>
            </h1>

            <p class="text-gray-400 text-lg lg:text-xl leading-relaxed mb-16 max-w-md">
                Your personal vocabulary companion. Collect, organize, and master words that matter to you.
            </p>

            <div class="flex items-center gap-12 lg:gap-16">
                <div class="flex flex-col gap-1">
                    <span class="text-3xl font-bold text-brand">10K+</span>
                    <span class="text-gray-500 text-sm font-medium">Words</span>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-3xl font-bold text-brand">5K+</span>
                    <span class="text-gray-500 text-sm font-medium">Users</span>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-3xl font-bold text-brand">12</span>
                    <span class="text-gray-500 text-sm font-medium">Languages</span>
                </div>
            </div>
        </div>

        <div class="w-full max-w-md mx-auto lg:mx-0">
            <div class="mb-8">
                <h2 class="text-3xl font-bold text-white mb-2">Welcome back</h2>
                <p class="text-gray-400">Sign in to continue to your vocabulary</p>
            </div>

            <button onclick={handleGoogleSignIn} class="w-full flex items-center justify-center gap-3 bg-transparent border border-gray-700 hover:bg-gray-800/50 hover:border-gray-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 mb-8">
                <svg viewBox="0 0 24 24" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
            </button>

            <div class="flex items-center gap-4 mb-8 text-gray-500 text-sm">
                <div class="flex-1 h-[1px] bg-gray-800"></div>
                <span>OR</span>
                <div class="flex-1 h-[1px] bg-gray-800"></div>
            </div>

            <form onsubmit={handleSignIn} class="space-y-5">
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input 
                        type="email" 
                        id="email"
                        placeholder="you@example.com" 
                        class="w-full bg-transparent border border-gray-700 focus:border-brand focus:ring-1 focus:ring-brand rounded-xl px-4 py-3.5 text-white placeholder-gray-500 outline-none transition-all duration-200"
                        required
                    />
                </div>

                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
                        <a href="/" class="text-sm text-brand hover:text-brand-bright transition-colors">Forgot password?</a>
                    </div>
                    <div class="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            id="password"
                            placeholder="••••••••" 
                            class="w-full bg-transparent border border-gray-700 focus:border-brand focus:ring-1 focus:ring-brand rounded-xl px-4 py-3.5 text-white placeholder-gray-500 outline-none transition-all duration-200"
                            required
                        />
                        <button 
                            type="button"
                            onclick={() => showPassword = !showPassword}
                            class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            {#if showPassword}
                                <EyeOff size={20} />
                            {:else}
                                <Eye size={20} />
                            {/if}
                        </button>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    class="w-full bg-brand hover:bg-brand-deep disabled:bg-brand/50 disabled:cursor-not-allowed text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-200 mt-4 flex justify-center items-center"
                >
                    {#if isLoading}
                        <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {:else}
                        Sign In
                    {/if}
                </button>
            </form>

            <p class="text-center text-gray-400 mt-8 text-sm">
                Don't have an account? <a href="/" class="text-brand hover:text-brand-bright font-medium ml-1 transition-colors">Sign up</a>
            </p>
        </div>
    </div>
</div>