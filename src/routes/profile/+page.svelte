<script lang="ts">
    import {
        ArrowLeft,
        Settings,
        BarChart3,
        Trophy,
        BookOpen,
        Bell,
        Moon,
        HelpCircle,
        LogOut,
        ChevronRight,
        Flame,
    } from "@lucide/svelte";
    import { goto } from "$app/navigation";
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

    let darkMode = $state(true);

    const menuItems = [
        {
            label: "View Detailed Stats",
            icon: BarChart3,
            action: () => goto("/progress"),
        },
        { label: "Achievements", icon: Trophy, action: null as (() => void) | null },
        { label: "Saved Words", icon: BookOpen, action: null },
        { label: "Notifications", icon: Bell, action: null },
        { label: "Help & Feedback", icon: HelpCircle, action: null },
    ];
</script>

<div
    class="min-h-screen bg-gradient-to-b from-[#020617] to-[#0b1120] text-white flex justify-center items-center p-4"
>
    <div class="w-full max-w-md bg-[#020617] rounded-2xl shadow-xl border border-white/10 p-6">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
            <button
                type="button"
                onclick={() => goto("/dashboard")}
                class="p-1 rounded-lg text-gray-300 hover:bg-white/10 cursor-pointer"
                aria-label="Back to dashboard"
            >
                <ArrowLeft class="w-5 h-5" />
            </button>
            <span class="text-sm text-gray-500">Profile</span>
            <Settings class="w-5 h-5 text-gray-500" aria-hidden="true" />
        </div>

        {#if user && profile}
            <!-- Profile Section -->
            <div class="text-center">
                <div
                    class="w-24 h-24 mx-auto rounded-full border-2 border-brand/80 overflow-hidden bg-slate-800 shrink-0"
                >
                    <img
                        src={avatarSrc}
                        alt=""
                        width={96}
                        height={96}
                        referrerpolicy={imgReferrerPolicy}
                        class="w-full h-full object-cover block"
                        loading="eager"
                        decoding="async"
                    />
                </div>
                <h2 class="mt-4 text-xl font-semibold">{displayName}</h2>
                <p class="text-gray-400 text-sm mt-1">{user.email}</p>
                <p class="text-gray-400 text-sm mt-2">Member since {memberSinceLabel}</p>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-3 gap-3 mt-6">
                <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p class="text-xs text-gray-400">Words Learned</p>
                    <p class="text-lg font-bold">{profile.totalWords}</p>
                </div>

                <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p class="text-xs text-gray-400">Streak Days</p>
                    <p class="text-lg font-bold flex justify-center items-center gap-1">
                        {profile.streakDays}
                        <Flame class="w-4 h-4 text-orange-400" />
                    </p>
                </div>

                <div
                    class="bg-white/5 border border-white/10 rounded-xl p-3 text-center flex flex-col min-h-[5.5rem]"
                >
                    <p class="text-xs text-gray-400">Level</p>
                    <p class="text-lg font-bold flex items-baseline justify-center gap-1 flex-wrap">
                        {profile.level.level}
                        {#if profile.level.isMaxed}
                            <span
                                class="text-[10px] font-semibold uppercase tracking-wide text-brand"
                                >Max</span
                            >
                        {/if}
                    </p>
                    {#if profile.level.isMaxed}
                        <p class="text-[10px] text-gray-500 mt-auto leading-tight">
                            2,500+ words
                        </p>
                    {:else}
                        <div class="w-full h-1 bg-gray-800 rounded-full mt-auto">
                            <div
                                class="h-1 bg-gradient-to-r from-brand to-brand-bright rounded-full transition-all"
                                style="width: {Math.min(
                                    100,
                                    profile.level.progressInLevel,
                                )}%"
                            ></div>
                        </div>
                        <p class="text-[10px] text-gray-500 mt-1">
                            {profile.level.wordsToNext} to level
                            {profile.level.level + 1}
                        </p>
                    {/if}
                </div>
            </div>

            <!-- Weekly Progress -->
            <div class="mt-6">
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-400">Weekly progress</span>
                    <span class="font-semibold">{profile.weeklyProgressPercent}%</span>
                </div>
                <p class="text-[10px] text-gray-500 mb-2">
                    Words added in the last 7 days vs your daily goal × 7
                </p>
                <div class="w-full h-2 bg-gray-800 rounded-full">
                    <div
                        class="h-2 bg-gradient-to-r from-brand to-brand-bright rounded-full transition-all"
                        style="width: {profile.weeklyProgressPercent}%"
                    ></div>
                </div>
            </div>

            <!-- Menu Items -->
            <div class="mt-6 space-y-1">
                {#each menuItems as item}
                    {@const Icon = item.icon}
                    <button
                        type="button"
                        class="w-full flex items-center justify-between py-3 border-b border-white/10 text-left hover:bg-white/5 rounded-lg px-1 -mx-1 transition cursor-pointer"
                        onclick={() => item.action?.()}
                    >
                        <div class="flex items-center gap-3">
                            <Icon class="w-5 h-5 text-brand" />
                            <span>{item.label}</span>
                        </div>
                        <ChevronRight class="w-5 h-5 text-gray-500 shrink-0" />
                    </button>
                {/each}

                <div class="flex items-center justify-between py-3 border-b border-white/10">
                    <div class="flex items-center gap-3">
                        <Moon class="w-5 h-5 text-brand" />
                        <span>Dark Mode</span>
                    </div>
                    <button
                        type="button"
                        class={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                            darkMode ? "bg-brand-deep" : "bg-gray-600"
                        }`}
                        onclick={() => (darkMode = !darkMode)}
                        aria-pressed={darkMode}
                        aria-label="Toggle dark mode"
                    >
                        <div
                            class={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                                darkMode ? "translate-x-5" : ""
                            }`}
                        ></div>
                    </button>
                </div>
            </div>

            <form method="POST" action="/api/auth/logout" class="mt-6">
                <button
                    type="submit"
                    class="w-full border border-red-500 text-red-500 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-500/10 transition cursor-pointer"
                >
                    <LogOut class="w-5 h-5" />
                    Log out
                </button>
            </form>
        {:else if !user}
            <p class="text-center text-gray-400 text-sm">
                <a href="/api/auth/google" class="text-brand hover:underline"
                    >Sign in</a
                >
                to view your profile.
            </p>
        {:else}
            <p class="text-center text-gray-400 text-sm">Loading profile…</p>
        {/if}
    </div>
</div>
