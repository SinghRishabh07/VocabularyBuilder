<script lang="ts">
    import { ArrowLeft, Flame, Trophy, Target } from "@lucide/svelte";
    import { goto, invalidateAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import type { PageData } from "./$types";
    import type { ProgressBarBucket } from "$lib/types";

    let { data } = $props<{ data: PageData }>();

    let activeTab = $state<"weekly" | "monthly" | "yearly">("weekly");
    const tabs = [
        { id: "weekly" as const, label: "Weekly" },
        { id: "monthly" as const, label: "Monthly" },
        { id: "yearly" as const, label: "Yearly" },
    ];

    const posMeta = {
        noun: { label: "Noun", class: "bg-[color:var(--color-brand-darker)]" },
        verb: { label: "Verb", class: "bg-[color:var(--color-brand-deep)]" },
        adjective: { label: "Adj", class: "bg-brand" },
        adverb: { label: "Adv", class: "bg-[color:var(--color-brand-bright)]" },
    } as const;

    type PosKey = keyof typeof posMeta;

    let barSeries = $derived.by((): ProgressBarBucket[] => {
        if (!data.loggedIn) return [];
        if (activeTab === "weekly") return data.barWeekly;
        if (activeTab === "monthly") return data.barMonthly;
        return data.barYearly;
    });

    let barMax = $derived(Math.max(1, ...barSeries.map((b) => b.total)));

    let periodSum = $derived(barSeries.reduce((a, b) => a + b.total, 0));

    const dayOfYear = () => {
        const n = new Date();
        const s = new Date(Date.UTC(n.getUTCFullYear(), 0, 1));
        return (
            1 + Math.floor((n.getTime() - s.getTime()) / 86_400_000)
        );
    };

    let periodAvg = $derived.by(() => {
        if (activeTab === "weekly") return periodSum / 7;
        if (activeTab === "monthly") return periodSum / 28;
        return periodSum / dayOfYear();
    });

    let periodLabel = $derived(
        activeTab === "weekly"
            ? "Last 7 days"
            : activeTab === "monthly"
              ? "Last 4 weeks"
              : "This year",
    );

    function formatHoverDate(ymd: string) {
        const d = new Date(ymd + "T12:00:00.000Z");
        return d.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    const heatLevelClass: Record<0 | 1 | 2 | 3, string> = {
        0: "bg-slate-800/90 border border-slate-700/30",
        1: "bg-[color:var(--color-brand-darker)]/45 border border-brand-darker/30",
        2: "bg-brand/50 border border-brand/40",
        3: "bg-[color:var(--color-brand-bright)]/85 border border-brand-bright/30",
    };

    // Daily goal local edit
    let goalInput = $state(5);
    let goalSaving = $state(false);
    $effect(() => {
        if (data.loggedIn) {
            goalInput = data.dailyWordGoal;
        }
    });

    async function saveDailyGoal() {
        const n = Math.round(goalInput);
        if (n < 1 || n > 500) {
            toast.error("Goal must be between 1 and 500");
            return;
        }
        goalSaving = true;
        try {
            const res = await fetch("/api/user/daily-goal", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dailyWordGoal: n }),
            });
            if (!res.ok) {
                const j = (await res.json().catch(() => ({}))) as { error?: string };
                throw new Error(j.error ?? "Save failed");
            }
            const j = (await res.json()) as { dailyWordGoal: number };
            goalInput = j.dailyWordGoal;
            await invalidateAll();
            toast.success("Daily goal updated");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save");
        } finally {
            goalSaving = false;
        }
    }

    const remaining = $derived(
        data.loggedIn ? Math.max(0, data.dailyWordGoal - data.todayWords) : 0,
    );
</script>

<div
    class="min-h-screen bg-[#020617] text-white p-4 md:p-8 flex justify-center"
>
    <div class="w-full max-w-5xl space-y-6">
        <div class="flex items-center gap-4">
            <button
                type="button"
                class="p-1 rounded-lg hover:bg-white/10"
                onclick={() => goto("/dashboard")}
                title="Back to dashboard"
            >
                <ArrowLeft class="w-5 h-5 text-gray-400" />
            </button>
            <h1 class="text-xl font-semibold">Progress</h1>
        </div>

        {#if !data.loggedIn}
            <p class="text-gray-400 text-center py-20">
                <a href="/api/auth/google" class="text-brand hover:underline"
                    >Sign in</a
                >
                to see your streaks, goals, and contribution graph.
            </p>
        {:else}
            <!-- Top Cards -->
            <div class="grid md:grid-cols-2 gap-4">
                <div
                    class="bg-white/5 border border-white/10 rounded-xl p-5"
                >
                    <div class="flex items-center gap-2 text-sm text-gray-400">
                        <Flame class="w-4 h-4 text-orange-400" />
                        Current Streak
                    </div>
                    <h2 class="text-3xl font-bold mt-2">
                        {data.currentStreak}
                        <span class="text-base text-gray-400">days</span>
                    </h2>
                    <p class="text-xs text-gray-500 mt-1">
                        Longest: {data.longestStreak} days
                    </p>
                </div>

                <div
                    class="bg-white/5 border border-white/10 rounded-xl p-5"
                >
                    <div class="flex items-center gap-2 text-sm text-gray-400">
                        <Trophy class="w-4 h-4 text-brand" />
                        Total Words
                    </div>
                    <h2 class="text-3xl font-bold mt-2">
                        {data.totalWords}
                    </h2>
                    <p class="text-xs text-gray-500 mt-1">
                        {data.activeDays} active days
                    </p>
                </div>
            </div>

            <!-- Stacked bar: words by part of speech per period -->
            <div class="bg-white/5 border border-white/10 rounded-xl p-5">
                <h2 class="font-medium mb-1">By category</h2>
                <p class="text-xs text-gray-500 mb-4">
                    Counts by each word’s first meaning (part of speech)
                </p>

                <div class="flex bg-white/10 rounded-lg p-1 mb-4">
                    {#each tabs as tab}
                        <button
                            type="button"
                            class="flex-1 py-1.5 text-sm rounded-md transition cursor-pointer
                                {activeTab === tab.id
                                ? 'bg-[#0f172a] text-white'
                                : 'text-gray-400'}"
                            onclick={() => (activeTab = tab.id)}
                        >
                            {tab.label}
                        </button>
                    {/each}
                </div>

                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h3 class="text-2xl font-bold">{periodSum}</h3>
                        <p class="text-xs text-gray-400">{periodLabel}</p>
                    </div>
                    <p class="text-sm text-brand">
                        {periodAvg < 10
                            ? periodAvg.toFixed(1)
                            : periodAvg.toFixed(0)} / day
                    </p>
                </div>

                <div
                    class="flex items-end justify-between gap-1.5 h-36"
                >
                    {#each barSeries as b}
                        {@const t = b.total}
                        <div
                            class="flex-1 min-w-0 h-full flex flex-col justify-end group relative"
                        >
                            <div
                                class="relative w-full"
                                style="height: {t
                                    ? (t / barMax) * 100
                                    : 0.5}%"
                            >
                                <div
                                    class="absolute inset-0 flex flex-col-reverse overflow-hidden rounded-sm"
                                >
                                    {#if t > 0}
                                        {#each (["noun", "verb", "adjective", "adverb"] as PosKey[]) as k}
                                            {@const c = b[k]}
                                            {#if c > 0}
                                                <div
                                                    class="w-full shrink-0 {posMeta[k]
                                                        .class} transition-opacity group-hover:opacity-95"
                                                    style="height: {(c / t) * 100}%"
                                                ></div>
                                            {/if}
                                        {/each}
                                    {:else}
                                        <div
                                            class="w-full h-0.5 bg-slate-800/80"
                                        ></div>
                                    {/if}
                                </div>
                            </div>
                            <p
                                class="text-center text-[10px] sm:text-xs text-gray-500 mt-1 truncate"
                            >
                                {b.label}
                            </p>
                            <div
                                class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2
                                    opacity-0 group-hover:opacity-100
                                    z-10 rounded-md bg-[#0f1423] border border-white/10 text-[10px] px-2 py-1
                                    text-gray-200 shadow-xl whitespace-nowrap"
                            >
                                {b.label}: {b.total} words
                            </div>
                        </div>
                    {/each}
                </div>

                <div
                    class="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-gray-500"
                >
                    {#each Object.entries(posMeta) as [k, v] (k)}
                        <div class="flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-sm {v.class}"
                            ></span>
                            {v.label}
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Heatmap -->
            <div class="bg-white/5 border border-white/10 rounded-xl p-5">
                <div class="flex flex-wrap justify-between text-sm text-gray-400 gap-2 mb-3">
                    <span
                        >{data.heatmap.totalWordsInWindow} words in the last
                        53 weeks</span
                    >
                    <span
                        >{data.heatmap.activeDaysInWindow} active days in this
                        range</span
                    >
                </div>

                <div class="overflow-x-auto">
                    <div class="w-max">
                        <div
                            class="grid gap-1 mb-2"
                            style="grid-template-columns: repeat({data
                                .heatmap.columnMonthLabels.length}, minmax(0, 1fr));"
                        >
                            {#each data.heatmap.columnMonthLabels as m}
                                <div
                                    class="text-center text-[10px] sm:text-xs text-gray-500 min-w-[10px] sm:min-w-3 h-4"
                                >
                                    {m ?? ""}
                                </div>
                            {/each}
                        </div>
                        <div
                            class="grid gap-1"
                            style="grid-template-columns: repeat({data
                                .heatmap.columnMonthLabels.length}, minmax(0, 1fr));"
                        >
                            {#each data.heatmap.cells as row}
                                {#each row as cell, ci}
                                    <div
                                        class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm
                                            {heatLevelClass[
                                                cell.level as 0 | 1 | 2 | 3
                                            ]}"
                                        title={cell.count > 0
                                            ? `${formatHoverDate(
                                                  cell.dateKey,
                                              )} — ${cell.count} word${cell.count === 1 ? "" : "s"}`
                                            : formatHoverDate(cell.dateKey)}
                                    ></div>
                                {/each}
                            {/each}
                        </div>
                    </div>
                </div>

                <div
                    class="flex justify-end items-center gap-2 mt-3 text-xs text-gray-400"
                >
                    <span>Less</span>
                    <div
                        class="w-3 h-3 rounded-sm bg-slate-800/90 border border-slate-700/30"
                    ></div>
                    <div
                        class="w-3 h-3 rounded-sm bg-[color:var(--color-brand-darker)]/50 border border-brand-darker/30"
                    ></div>
                    <div
                        class="w-3 h-3 rounded-sm bg-brand/50 border border-brand/40"
                    ></div>
                    <div
                        class="w-3 h-3 rounded-sm bg-[color:var(--color-brand-bright)]/85 border border-brand-bright/30"
                    ></div>
                </div>
            </div>

            <!-- Daily goal + Milestones -->
            <div class="grid md:grid-cols-2 gap-4">
                <div class="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div class="flex items-center gap-2 text-sm text-gray-400">
                        <Target class="w-4 h-4 text-brand" />
                        Daily goal
                    </div>

                    <h2 class="text-xl font-bold mt-2">
                        {data.todayWords} / {data.dailyWordGoal} words
                    </h2>

                    <div class="w-full h-2 bg-gray-800 rounded-full mt-3">
                        <div
                            class="h-2 bg-brand rounded-full transition-all"
                            style="width: {Math.min(
                                100,
                                (data.todayWords / Math.max(1, data.dailyWordGoal)) *
                                    100,
                            )}%"
                        ></div>
                    </div>

                    <p class="text-xs text-gray-400 mt-2">
                        {#if remaining > 0}
                            {remaining} more to hit today’s goal
                        {:else}
                            Daily goal met — {data.dailyWordGoal} words in your
                            vocabulary log today
                        {/if}
                    </p>

                    <form
                        class="mt-4 flex flex-wrap items-end gap-2"
                        onsubmit={(e) => {
                            e.preventDefault();
                            void saveDailyGoal();
                        }}
                    >
                        <label
                            for="goal"
                            class="text-xs text-gray-500 w-full"
                            >Set your target (1–500)</label
                        >
                        <input
                            id="goal"
                            type="number"
                            min="1"
                            max="500"
                            bind:value={goalInput}
                            class="w-20 rounded-md bg-[#0f172a] border border-white/10 px-2 py-1.5 text-sm"
                        />
                        <button
                            type="submit"
                            class="px-3 py-1.5 text-sm rounded-md bg-brand/20 text-brand border border-brand/30 hover:bg-brand/30 disabled:opacity-50"
                            disabled={goalSaving}
                        >
                            {goalSaving ? "…" : "Save"}
                        </button>
                    </form>
                </div>

                <div class="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h2 class="text-sm text-gray-400 mb-3">
                        Recent milestones
                    </h2>
                    <div class="space-y-3 text-sm">
                        {#if data.milestones.length === 0}
                            <p class="text-gray-500">
                                Add more words to unlock milestones
                            </p>
                        {:else}
                            {#each data.milestones as m}
                                <div class="flex justify-between gap-2">
                                    <span>{m.title}</span>
                                    <span class="text-gray-400 shrink-0"
                                        >{m.detail}</span
                                    >
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
