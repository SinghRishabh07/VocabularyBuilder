<script lang="ts">
    import {
        ArrowLeft,
        BarChart3,
        Trophy,
        BookOpen,
        Bell,
        Moon,
        HelpCircle,
        LogOut,
        ChevronRight,
        Flame,
        Library,
        Target,
        Sparkles,
        ChevronDown,
        Heart,
    } from "@lucide/svelte";
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import type { PublicUser, ProfileStats } from "$lib/types";
    import { dicebearAvatarUrl, imgReferrerPolicy } from "$lib/avatarUrl";

    let { data } = $props<{
        data: { user: PublicUser | null; profile: ProfileStats | null };
    }>();

    let user = $derived(data.user);
    let profile = $derived(data.profile);

    let displayName = $derived(
        user?.name?.trim()
            ? user.name
            : user?.email
              ? user.email.split("@")[0] ?? "Member"
              : "Member",
    );

    let memberSinceLabel = $derived(
        user
            ? new Intl.DateTimeFormat(undefined, {
                  month: "long",
                  year: "numeric",
              }).format(new Date(user.createdAt))
            : "",
    );

    let avatarSrc = $derived(
        user ? (user.image?.trim() ? user.image : dicebearAvatarUrl(user.email)) : "",
    );

    let streakCaption = $derived(
        profile
            ? profile.streakDays > 0
                ? `${profile.streakDays}-day streak — add a word today to keep it alive.`
                : "Add your first word today to start a streak."
            : "",
    );

    let darkMode = $state(true);

    const settingsRows: {
        label: string;
        description?: string;
        icon: typeof BarChart3;
        action: "progress" | "vocabulary" | "achievements" | "notifications" | "help" | null;
    }[] = [
        {
            label: "Detailed stats",
            description: "Charts, heatmaps, and goals",
            icon: BarChart3,
            action: "progress",
        },
        {
            label: "Achievements",
            description: "Coming soon",
            icon: Trophy,
            action: "achievements",
        },
        {
            label: "My vocabulary",
            description: "Browse and edit saved words",
            icon: Library,
            action: "vocabulary",
        },
        {
            label: "Notifications",
            description: "Reminders and updates",
            icon: Bell,
            action: "notifications",
        },
        {
            label: "Help & feedback",
            icon: HelpCircle,
            action: "help",
        },
    ];

    function rowAction(kind: NonNullable<(typeof settingsRows)[number]["action"]>) {
        if (kind === "progress") void goto("/progress");
        else if (kind === "vocabulary") void goto("/vocabulary");
        else if (kind === "achievements") {
            toast.info("Achievements", { description: "This section is coming soon." });
        } else if (kind === "notifications") {
            toast.info("Notifications", {
                description: "Inbox coming soon. You’ll get reminders here.",
            });
        } else if (kind === "help") {
            toast.info("Help", { description: "Feedback tools are on the way." });
        }
    }
</script>

<div class="min-h-full bg-[var(--surface-0)] text-gray-100 selection:bg-brand-darker/40">
    <div class="mx-auto max-w-6xl px-4 pb-10 pt-3 lg:px-8 lg:pb-14 lg:pt-8">
        <!-- Mobile top bar -->
        <div class="mb-6 flex items-center justify-between lg:hidden">
            <button
                type="button"
                onclick={() => goto("/dashboard")}
                class="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/[0.06] hover:text-gray-200"
                aria-label="Back to home"
            >
                <ArrowLeft class="h-5 w-5" strokeWidth={2} />
            </button>
            <span class="text-[13px] font-medium text-gray-500">Profile</span>
            <div class="w-10" aria-hidden="true"></div>
        </div>

        {#if user && profile}
            <div class="grid gap-8 lg:grid-cols-12 lg:gap-10">
                <!-- Sidebar: identity + quick actions (desktop); stacked on mobile -->
                <aside class="space-y-6 lg:col-span-4 lg:space-y-8">
                    <div
                        class="flex flex-col items-center text-center lg:items-start lg:text-left"
                    >
                        <div
                            class="relative h-[7.5rem] w-[7.5rem] shrink-0 overflow-hidden rounded-full border border-white/[0.08] bg-[var(--surface-2)] shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.04] transition hover:ring-brand/20 lg:h-32 lg:w-32"
                        >
                            <img
                                src={avatarSrc}
                                alt=""
                                width={128}
                                height={128}
                                referrerpolicy={imgReferrerPolicy}
                                class="h-full w-full object-cover"
                                loading="eager"
                                decoding="async"
                            />
                        </div>
                        <h1
                            class="mt-5 text-[1.375rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.5rem] lg:text-[1.75rem]"
                        >
                            {displayName}
                        </h1>
                        <p class="mt-1 max-w-md text-[14px] text-gray-400">{user.email}</p>
                        <p class="mt-2 text-[12px] text-gray-500">
                            Member since {memberSinceLabel}
                        </p>
                        <p
                            class="mt-4 flex max-w-md items-start justify-center gap-2 text-[13px] leading-snug text-gray-400 lg:justify-start"
                        >
                            <Flame
                                class="mt-0.5 h-4 w-4 shrink-0 text-brand/80"
                                strokeWidth={2}
                                aria-hidden="true"
                            />
                            <span>{streakCaption}</span>
                        </p>
                    </div>

                    <div class="hidden space-y-2 lg:block">
                        <p
                            class="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500"
                        >
                            Quick actions
                        </p>
                        <div class="flex flex-col gap-2">
                            <button
                                type="button"
                                onclick={() => goto("/vocabulary")}
                                class="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-[14px] font-medium text-gray-200 transition hover:border-brand/25 hover:bg-brand/[0.06] hover:text-white"
                            >
                                <Library class="h-4 w-4 text-brand" strokeWidth={2} />
                                Open vocabulary
                                <ChevronRight class="ml-auto h-4 w-4 text-gray-600" />
                            </button>
                            <button
                                type="button"
                                onclick={() => goto("/progress")}
                                class="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-[14px] font-medium text-gray-200 transition hover:border-brand/25 hover:bg-brand/[0.06] hover:text-white"
                            >
                                <BarChart3 class="h-4 w-4 text-brand" strokeWidth={2} />
                                View progress
                                <ChevronRight class="ml-auto h-4 w-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </aside>

                <!-- Main -->
                <div class="space-y-8 lg:col-span-8">
                    <!-- Desktop header strip: headline + ring -->
                    <div
                        class="hidden items-center justify-between gap-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 lg:flex"
                    >
                        <div>
                            <p class="text-[13px] text-gray-500">This week</p>
                            <p class="mt-1 text-[1.25rem] font-semibold text-white">
                                {profile.weeklyWordsAdded} of {profile.weeklyTarget} words
                            </p>
                            <p class="mt-0.5 text-[12px] text-gray-500">
                                Based on your daily goal ({profile.dailyWordGoal} / day)
                            </p>
                        </div>
                        <div
                            class="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full p-[3px] transition duration-300"
                            style="background: conic-gradient(from -90deg, var(--color-brand) {profile.weeklyProgressPercent}%, rgba(255,255,255,0.08) 0)"
                            aria-hidden="true"
                        >
                            <div
                                class="flex h-full w-full flex-col items-center justify-center rounded-full bg-[var(--surface-1)]"
                            >
                                <span class="text-[15px] font-bold tabular-nums text-white"
                                    >{profile.weeklyProgressPercent}</span
                                >
                                <span class="text-[9px] font-medium uppercase tracking-wide text-gray-500"
                                    >%</span
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Primary stats: mobile shows 2; desktop shows full grid -->
                    <section>
                        <h2 class="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 lg:text-[12px]">
                            Overview
                        </h2>
                        <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
                            <div
                                class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-white/[0.1] lg:p-5"
                            >
                                <div class="flex items-center gap-2 text-[12px] text-gray-500">
                                    <BookOpen class="h-3.5 w-3.5 text-brand/70" strokeWidth={2} />
                                    Words saved
                                </div>
                                <p class="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-white lg:text-[1.75rem]">
                                    {profile.totalWords}
                                </p>
                            </div>
                            <div
                                class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-white/[0.1] lg:p-5"
                            >
                                <div class="flex items-center gap-2 text-[12px] text-gray-500">
                                    <Flame class="h-3.5 w-3.5 text-brand/70" strokeWidth={2} />
                                    Streak
                                </div>
                                <p class="mt-3 flex items-baseline gap-1.5 text-2xl font-semibold tabular-nums text-white lg:text-[1.75rem]">
                                    {profile.streakDays}
                                    <span class="text-[13px] font-normal text-gray-500">days</span>
                                </p>
                            </div>

                            <!-- Hidden on tiny mobile in first row? User asked mobile show 2 first - use details for rest -->
                            <div
                                class="col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-white/[0.1] lg:col-span-1 lg:p-5"
                            >
                                <div class="flex items-center gap-2 text-[12px] text-gray-500">
                                    <Sparkles class="h-3.5 w-3.5 text-brand/70" strokeWidth={2} />
                                    Level
                                </div>
                                <p class="mt-3 flex flex-wrap items-baseline gap-2 text-2xl font-semibold text-white lg:text-[1.75rem]">
                                    {profile.level.level}
                                    {#if profile.level.isMaxed}
                                        <span class="text-[11px] font-semibold uppercase tracking-wide text-brand"
                                            >Max</span
                                        >
                                    {/if}
                                </p>
                                {#if !profile.level.isMaxed}
                                    <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                        <div
                                            class="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand transition-all duration-500"
                                            style="width: {Math.min(100, profile.level.progressInLevel)}%"
                                        ></div>
                                    </div>
                                    <p class="mt-1.5 text-[11px] text-gray-500">
                                        {profile.level.wordsToNext} words to level {profile.level.level + 1}
                                    </p>
                                {:else}
                                    <p class="mt-2 text-[11px] text-gray-500">2,500+ words — top level</p>
                                {/if}
                            </div>
                        </div>

                        <!-- Mobile: extra metrics in collapsible -->
                        <details
                            class="group mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] lg:hidden"
                        >
                            <summary
                                class="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 text-[14px] font-medium text-gray-300 [&::-webkit-details-marker]:hidden"
                            >
                                More metrics
                                <ChevronDown
                                    class="h-4 w-4 shrink-0 text-gray-500 transition group-open:rotate-180"
                                    strokeWidth={2}
                                />
                            </summary>
                            <div class="grid grid-cols-2 gap-3 border-t border-white/[0.04] px-4 pb-4 pt-3">
                                <div class="rounded-xl bg-white/[0.03] px-3 py-3">
                                    <p class="text-[11px] text-gray-500">Favorites</p>
                                    <p class="mt-1 text-lg font-semibold text-white">{profile.favoriteWords}</p>
                                </div>
                                <div class="rounded-xl bg-white/[0.03] px-3 py-3">
                                    <p class="text-[11px] text-gray-500">Daily goal</p>
                                    <p class="mt-1 text-lg font-semibold text-white">{profile.dailyWordGoal} <span class="text-xs font-normal text-gray-500">/ day</span></p>
                                </div>
                                <div class="col-span-2 rounded-xl bg-white/[0.03] px-3 py-3">
                                    <p class="text-[11px] text-gray-500">This week</p>
                                    <p class="mt-1 text-[15px] font-medium text-white">
                                        {profile.weeklyWordsAdded} / {profile.weeklyTarget} words
                                    </p>
                                    <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                        <div
                                            class="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand-bright"
                                            style="width: {profile.weeklyProgressPercent}%"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <!-- Desktop: second row stats -->
                        <div class="mt-3 hidden gap-3 lg:grid lg:grid-cols-3">
                            <div
                                class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition hover:border-white/[0.1]"
                            >
                                <div class="flex items-center gap-2 text-[12px] text-gray-500">
                                    <Heart class="h-3.5 w-3.5 text-brand/70" strokeWidth={2} />
                                    Favorites
                                </div>
                                <p class="mt-3 text-[1.65rem] font-semibold tabular-nums text-white">
                                    {profile.favoriteWords}
                                </p>
                                <p class="mt-3 text-[1.65rem] font-semibold tabular-nums text-white">
                                    {profile.dailyWordGoal}
                                    <span class="text-[14px] font-normal text-gray-500">words / day</span>
                                </p>
                            </div>
                            <div
                                class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition hover:border-white/[0.1]"
                            >
                                <div class="flex items-center gap-2 text-[12px] text-gray-500">
                                    <Sparkles class="h-3.5 w-3.5 text-brand/70" strokeWidth={2} />
                                    Weekly target
                                </div>
                                <p class="mt-3 text-[1.65rem] font-semibold tabular-nums text-white">
                                    {profile.weeklyTarget}
                                    <span class="text-[14px] font-normal text-gray-500">words / week</span>
                                </p>
                            </div>
                        </div>
                    </section>

                    <!-- Weekly progress (mobile bar; desktop has ring above) -->
                    <section class="lg:hidden">
                        <h2 class="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Weekly momentum
                        </h2>
                        <div class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                            <div class="flex items-center gap-4">
                                <div
                                    class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full p-[2.5px]"
                                    style="background: conic-gradient(from -90deg, var(--color-brand) {profile.weeklyProgressPercent}%, rgba(255,255,255,0.08) 0)"
                                    aria-hidden="true"
                                >
                                    <div
                                        class="flex h-full w-full flex-col items-center justify-center rounded-full bg-[var(--surface-1)]"
                                    >
                                        <span class="text-[13px] font-bold tabular-nums">{profile.weeklyProgressPercent}%</span>
                                    </div>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="text-[14px] font-medium text-white">
                                        {profile.weeklyWordsAdded} / {profile.weeklyTarget} this week
                                    </p>
                                    <p class="mt-1 text-[12px] text-gray-500">
                                        Daily goal × 7 — stay consistent to fill the ring.
                                    </p>
                                    <div class="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                                        <div
                                            class="h-full rounded-full bg-gradient-to-r from-brand-deep via-brand to-brand-bright transition-all duration-700"
                                            style="width: {profile.weeklyProgressPercent}%"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="hidden lg:block">
                        <h2 class="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Weekly momentum
                        </h2>
                        <div class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
                            <div class="flex items-end justify-between gap-4">
                                <div>
                                    <p class="text-[15px] font-medium text-white">Words added vs target</p>
                                    <p class="mt-1 text-[13px] text-gray-500">
                                        Last 7 days compared to your daily goal × 7.
                                    </p>
                                </div>
                                <span class="text-[1.5rem] font-semibold tabular-nums text-brand"
                                    >{profile.weeklyProgressPercent}%</span
                                >
                            </div>
                            <div class="mt-5 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                                <div
                                    class="h-full rounded-full bg-gradient-to-r from-brand-deep via-brand to-brand-bright transition-all duration-700"
                                    style="width: {profile.weeklyProgressPercent}%"
                                ></div>
                            </div>
                        </div>
                    </section>

                    <!-- Settings / nav -->
                    <section>
                        <h2 class="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 lg:text-[12px]">
                            Settings & navigation
                        </h2>
                        <div class="space-y-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2">
                            {#each settingsRows as row}
                                {@const Icon = row.icon}
                                <button
                                    type="button"
                                    disabled={!row.action}
                                    onclick={() => row.action && rowAction(row.action)}
                                    class="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04] disabled:pointer-events-none disabled:opacity-50 sm:items-center"
                                >
                                    <div
                                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
                                    >
                                        <Icon class="h-4 w-4" strokeWidth={2} />
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <p class="text-[14px] font-medium text-gray-200">{row.label}</p>
                                        {#if row.description}
                                            <p class="mt-0.5 text-[12px] text-gray-500">{row.description}</p>
                                        {/if}
                                    </div>
                                    {#if row.action}
                                        <ChevronRight class="mt-1 h-4 w-4 shrink-0 text-gray-600 sm:mt-0" />
                                    {/if}
                                </button>
                            {/each}
                        </div>

                        <div class="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                            <div class="flex items-center justify-between gap-4">
                                <div class="flex items-center gap-3">
                                    <div
                                        class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand"
                                    >
                                        <Moon class="h-4 w-4" strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p class="text-[14px] font-medium text-gray-200">Appearance</p>
                                        <p class="text-[12px] text-gray-500">Dark theme (default)</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    class="relative h-7 w-12 shrink-0 rounded-full border p-0.5 transition hover:border-brand/30 {darkMode
                                        ? 'border-brand/30 bg-brand/15'
                                        : 'border-white/[0.08] bg-white/[0.06]'}"
                                    onclick={() => (darkMode = !darkMode)}
                                    aria-pressed={darkMode}
                                    aria-label="Toggle dark mode"
                                >
                                    <span
                                        class="block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 {darkMode
                                            ? 'translate-x-5'
                                            : 'translate-x-0.5'}"
                                    ></span>
                                </button>
                            </div>
                        </div>
                    </section>

                    <form method="POST" action="/api/auth/logout" class="pt-1">
                        <button
                            type="submit"
                            class="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] py-3 text-[14px] font-medium text-red-300/95 transition hover:border-red-500/30 hover:bg-red-500/10"
                        >
                            <LogOut class="h-4 w-4" strokeWidth={2} />
                            Log out
                        </button>
                    </form>

                    <div class="flex gap-2 pt-2 lg:hidden">
                        <button
                            type="button"
                            onclick={() => goto("/vocabulary")}
                            class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 text-[13px] font-medium text-gray-200 transition active:scale-[0.99]"
                        >
                            <Library class="h-4 w-4 text-brand" />
                            Vocabulary
                        </button>
                        <button
                            type="button"
                            onclick={() => goto("/progress")}
                            class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 text-[13px] font-medium text-gray-200 transition active:scale-[0.99]"
                        >
                            <BarChart3 class="h-4 w-4 text-brand" />
                            Progress
                        </button>
                    </div>
                </div>
            </div>
        {:else if !user}
            <div
                class="mx-auto max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-12 text-center"
            >
                <p class="text-[14px] text-gray-400">
                    <a href="/api/auth/google" class="font-medium text-brand hover:underline">Sign in</a>
                    to view your profile.
                </p>
            </div>
        {:else}
            <p class="text-center text-[14px] text-gray-500">Loading profile…</p>
        {/if}
    </div>
</div>
