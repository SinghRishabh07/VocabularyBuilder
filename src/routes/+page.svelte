<script lang="ts">
    import { onMount } from "svelte";
    import { BookOpen } from "@lucide/svelte";
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";

    let ready = $state(false);

    onMount(() => {
        ready = true;
        const params = new URLSearchParams(window.location.search);
        if (params.get("login") !== "required") return;

        toast.info("Sign in required", {
            description:
                "That page is only available when you are logged in. Continue with Google to open your space.",
        });

        params.delete("login");
        const next =
            window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
        void goto(next, { replaceState: true, noScroll: true });
    });

    function goToGoogleAuth() {
        void goto("/api/auth/google");
    }
</script>

<div
    class="auth-shell relative isolate flex min-h-dvh flex-col overflow-hidden bg-[var(--surface-0)] text-gray-100 selection:bg-brand-darker/35 selection:text-white"
>
    <!-- Ambient layers -->
    <div
        class="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
    >
        <div
            class="absolute -left-[20%] top-[-25%] h-[55vmin] w-[55vmin] rounded-full bg-brand-darker/[0.14] blur-[100px]"
        ></div>
        <div
            class="absolute -right-[15%] bottom-[-20%] h-[50vmin] w-[50vmin] rounded-full bg-brand-deep/[0.12] blur-[110px]"
        ></div>
        <div
            class="absolute left-1/2 top-1/3 h-[40vmin] w-[72vmin] -translate-x-1/2 rounded-full bg-brand/[0.06] blur-[90px]"
        ></div>
        <div class="auth-grain absolute inset-0 opacity-[0.35] mix-blend-overlay"></div>
        <div
            class="pointer-events-none absolute bottom-[12%] left-[8%] hidden font-serif text-[clamp(4rem,14vmin,9rem)] font-medium leading-none text-white/[0.03] lg:block"
        >
            ƒ
        </div>
        <div
            class="pointer-events-none absolute right-[6%] top-[18%] hidden font-serif text-[clamp(3rem,10vmin,7rem)] font-medium leading-none text-white/[0.025] lg:block"
        >
            ω
        </div>
    </div>

    <main
        class="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-8 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] lg:min-h-0 lg:flex-row lg:items-stretch lg:gap-0 lg:px-10 lg:py-14 lg:pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
        <!-- Brand / story -->
        <section
            class={`auth-fade flex flex-col justify-center max-lg:items-center max-lg:text-center lg:w-[52%] lg:flex-none lg:pr-14 xl:pr-20 ${ready ? "auth-fade-in" : ""}`}
        >
            <div
                class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] lg:mb-7 lg:h-14 lg:w-14"
            >
                <BookOpen class="h-6 w-6 text-brand/85" strokeWidth={1.75} aria-hidden="true" />
            </div>

            <h1
                class="max-w-lg text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.02em] text-white sm:text-[2rem] lg:text-[2.75rem] xl:text-[3.25rem]"
            >
                Vocab<span class="font-semibold text-brand/75">Vault</span>
            </h1>

            <p
                class="mt-3 max-w-md text-[1.125rem] font-normal leading-snug text-gray-300 sm:text-[1.25rem] lg:mt-4 lg:text-[1.625rem] lg:leading-tight"
            >
                Build a vocabulary you’ll actually remember.
            </p>
            <p class="mt-2 max-w-md text-[0.875rem] leading-relaxed text-gray-500 sm:text-[0.9375rem] lg:text-[1rem]"
            >
                Your personal space for meaningful words — calm, focused, and entirely yours.
            </p>

            <ul
                class="mt-6 hidden max-w-sm space-y-2 text-left text-[0.8125rem] text-gray-500 lg:block"
                aria-hidden="true"
            >
                <li class="flex items-center gap-2.5 border-l-2 border-brand/25 pl-3">
                    Collect words. Understand them deeply.
                </li>
                <li class="flex items-center gap-2.5 border-l-2 border-transparent pl-3 text-gray-600">
                    Learn words that stay with you.
                </li>
            </ul>
        </section>

        <!-- Auth panel -->
        <section
            class={`auth-fade flex flex-1 flex-col justify-center lg:w-[48%] lg:flex-none lg:pl-6 xl:pl-10 ${ready ? "auth-fade-in auth-fade-delay" : ""}`}
        >
            <div
                class="mx-auto w-full max-w-md rounded-3xl border border-white/[0.06] bg-white/[0.025] px-6 py-7 shadow-[0_24px_64px_-32px_rgba(0,0,0,0.75)] backdrop-blur-xl lg:px-9 lg:py-10"
            >
                <h2 class="text-[1.125rem] font-semibold tracking-tight text-white lg:text-xl">
                    Welcome in
                </h2>
                <p class="mt-1.5 text-[0.875rem] leading-relaxed text-gray-500 lg:text-[0.9375rem]">
                    Sign in once to sync your collection and keep learning without friction.
                </p>

                <button
                    type="button"
                    onclick={goToGoogleAuth}
                    class="group mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-[0.9375rem] font-medium text-gray-100 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.07] hover:shadow-[0_12px_40px_-24px_rgba(124,58,237,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)] active:scale-[0.99] motion-safe:hover:-translate-y-px"
                >
                    <svg
                        viewBox="0 0 24 24"
                        class="h-[1.125rem] w-[1.125rem] shrink-0 opacity-90 transition-opacity group-hover:opacity-100"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    <span>Continue with Google</span>
                </button>

                <p class="mt-5 text-center text-[0.75rem] leading-relaxed text-gray-600 sm:mt-6 lg:text-[0.8125rem]">
                    Your words stay private to you. Secure sign-in — we’ll never post without permission.
                </p>
            </div>
        </section>
    </main>
</div>

<style>
    .auth-grain {
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
        background-size: 180px 180px;
    }

    .auth-fade {
        opacity: 0;
        transform: translateY(8px);
    }

    .auth-fade-in {
        animation: auth-enter 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    .auth-fade-delay {
        animation-delay: 0.08s;
    }

    @keyframes auth-enter {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .auth-fade {
            opacity: 1;
            transform: none;
        }
        .auth-fade-in {
            animation: none;
        }
        .auth-fade-delay {
            animation-delay: 0s;
        }
    }
</style>
