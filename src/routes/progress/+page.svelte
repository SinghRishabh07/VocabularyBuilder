<script lang="ts">
    import {
        ArrowLeft,
        Flame,
        Trophy,
        Target,
        TrendingUp,
        Calendar,
        Sparkles,
        ChevronDown,
        BarChart2,
    } from "@lucide/svelte";
    import { goto, invalidateAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import type { PageData } from "./$types";
    import type { ProgressBarBucket } from "$lib/types";

    let { data } = $props<{ data: PageData }>();

    let activeTab = $state<"weekly" | "monthly" | "yearly">("weekly");
    const tabs = [
        { id: "weekly" as const, label: "Week" },
        { id: "monthly" as const, label: "Month" },
        { id: "yearly" as const, label: "Year" },
    ];

    const posMeta = {
        noun: { label: "Noun", class: "bg-[color:var(--color-brand-darker)]" },
        verb: { label: "Verb", class: "bg-[color:var(--color-brand-deep)]" },
        adjective: { label: "Adj.", class: "bg-brand" },
        adverb: { label: "Adv.", class: "bg-[color:var(--color-brand-bright)]" },
    } as const;

    type PosKey = keyof typeof posMeta;

    const posOrder = ["noun", "verb", "adjective", "adverb"] as const;

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
        return 1 + Math.floor((n.getTime() - s.getTime()) / 86_400_000);
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
              : "Year to date",
    );

    function formatHoverDate(ymd: string) {
        const d = new Date(ymd + "T12:00:00.000Z");
        return d.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    }

    const heatLevelClass: Record<0 | 1 | 2 | 3, string> = {
        0: "bg-white/[0.06] border border-white/[0.04]",
        1: "bg-brand-darker/50 border border-brand-darker/25",
        2: "bg-brand/55 border border-brand/35",
        3: "bg-brand-bright/80 border border-brand-bright/35",
    };

    let donutBackground = $derived.by(() => {
        if (!data.loggedIn) return "";
        const pt = data.posTotals;
        const colors: Record<(typeof posOrder)[number], string> = {
            noun: "var(--color-brand-darker)",
            verb: "var(--color-brand-deep)",
            adjective: "var(--color-brand)",
            adverb: "var(--color-brand-bright)",
        };
        const sum = posOrder.reduce((s, k) => s + pt[k], 0);
        if (sum === 0) {
            return "conic-gradient(from -90deg, rgba(255,255,255,0.07) 0deg 360deg)";
        }
        let angle = 0;
        const stops: string[] = [];
        for (const k of posOrder) {
            const frac = (pt[k] / sum) * 360;
            if (frac <= 0) continue;
            stops.push(`${colors[k]} ${angle}deg ${angle + frac}deg`);
            angle += frac;
        }
        return `conic-gradient(from -90deg, ${stops.join(", ")})`;
    });

    let dailyRingPct = $derived(
        data.loggedIn
            ? Math.min(
                  100,
                  (data.todayWords / Math.max(1, data.dailyWordGoal)) * 100,
              )
            : 0,
    );

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
            toast.success("Daily goal saved");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save");
        } finally {
            goalSaving = false;
        }
    }

    const remaining = $derived(
        data.loggedIn ? Math.max(0, data.dailyWordGoal - data.todayWords) : 0,
    );

    function formatMilestoneDate(iso: string) {
        return new Date(iso).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }
</script>

<div
    class="min-h-full bg-[var(--surface-0)] text-gray-100 selection:bg-brand-darker/40"
>
    <div class="mx-auto max-w-7xl px-4 pb-12 pt-3 lg:px-8 lg:pb-16 lg:pt-6">
        <!-- Header -->
        <header class="mb-8 lg:mb-10">
            <div class="flex flex-wrap items-start gap-4 lg:items-center lg:justify-between">
                <div class="flex items-start gap-3">
                    <button
                        type="button"
                        onclick={() => goto("/dashboard")}
                        class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/[0.06] hover:text-gray-200"
                        aria-label="Back"
                    >
                        <ArrowLeft class="h-5 w-5" strokeWidth={2} />
                    </button>
                    <div>
                        <h1
                            class="text-[1.375rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.625rem] lg:text-[1.875rem]"
                        >
                            Your learning
                        </h1>
                        <p class="mt-1 max-w-xl text-[13px] leading-relaxed text-gray-500 sm:text-[14px]">
                            Track your consistency and growth — one word at a time.
                        </p>
                    </div>
                </div>
            </div>
        </header>

        {#if !data.loggedIn}
            <div
                class="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center"
            >
                <p class="text-[15px] text-gray-400">
                    <a href="/api/auth/google" class="font-medium text-brand hover:underline"
                        >Sign in</a
                    >
                    to see streaks, goals, and your contribution graph.
                </p>
            </div>
        {:else}
            <!-- Summary metrics -->
            <section class="mb-8 lg:mb-10">
                <h2 class="sr-only">Overview</h2>
                <div
                    class="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-4"
                >
                    <div
                        class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition duration-200 hover:border-white/[0.1] sm:col-span-1 lg:col-span-3"
                    >
                        <div class="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-gray-500">
                            <Flame class="h-4 w-4 text-brand/80" strokeWidth={2} />
                            Current streak
                        </div>
                        <p class="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-white lg:text-[2rem]">
                            {data.currentStreak}
                            <span class="text-[15px] font-normal text-gray-500">days</span>
                        </p>
                        <p class="mt-2 text-[12px] text-gray-500">
                            Best: {data.longestStreak} days
                        </p>
                    </div>

                    <div
                        class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition duration-200 hover:border-white/[0.1] sm:col-span-1 lg:col-span-3"
                    >
                        <div class="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-gray-500">
                            <Trophy class="h-4 w-4 text-brand/80" strokeWidth={2} />
                            Words saved
                        </div>
                        <p class="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-white lg:text-[2rem]">
                            {data.totalWords}
                        </p>
                        <p class="mt-2 text-[12px] text-gray-500">
                            {data.activeDays} active days total
                        </p>
                    </div>

                    <div
                        class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition duration-200 hover:border-white/[0.1] sm:col-span-2 lg:col-span-3"
                    >
                        <div class="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-gray-500">
                            <Calendar class="h-4 w-4 text-brand/80" strokeWidth={2} />
                            This week
                        </div>
                        <p class="mt-3 text-2xl font-semibold tabular-nums text-white">
                            {data.weeklyWordsAdded}
                            <span class="text-[14px] font-normal text-gray-500"
                                >/ {data.weeklyTarget}</span
                            >
                        </p>
                        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                                class="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand-bright transition-all duration-700"
                                style="width: {data.weeklyProgressPercent}%"
                            ></div>
                        </div>
                        <p class="mt-2 text-[12px] text-gray-500">
                            {data.weeklyProgressPercent}% of weekly target
                        </p>
                    </div>

                    <div
                        class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition duration-200 hover:border-white/[0.1] sm:col-span-1 lg:col-span-3"
                    >
                        <div class="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-gray-500">
                            <TrendingUp class="h-4 w-4 text-brand/80" strokeWidth={2} />
                            Consistency
                        </div>
                        <p class="mt-3 text-3xl font-semibold tabular-nums text-white lg:text-[2rem]">
                            {data.consistencyRate}<span class="text-lg font-normal text-gray-500">%</span>
                        </p>
                        <p class="mt-2 text-[12px] text-gray-500">
                            Active days in the last 28
                        </p>
                    </div>

                    <!-- Level — full width on mobile row 3 -->
                    <div
                        class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition duration-200 hover:border-white/[0.1] sm:col-span-2 lg:col-span-4"
                    >
                        <div class="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-gray-500">
                            <Sparkles class="h-4 w-4 text-brand/80" strokeWidth={2} />
                            Level
                        </div>
                        <div class="mt-3 flex flex-wrap items-end gap-3">
                            <p class="text-3xl font-semibold tabular-nums text-white lg:text-[2rem]">
                                {data.level.level}
                                {#if data.level.isMaxed}
                                    <span
                                        class="ml-1 text-[11px] font-semibold uppercase tracking-wide text-brand"
                                        >Max</span
                                    >
                                {/if}
                            </p>
                            {#if !data.level.isMaxed}
                                <div class="min-w-[8rem] flex-1 pb-1">
                                    <div class="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                        <div
                                            class="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand transition-all duration-500"
                                            style="width: {Math.min(100, data.level.progressInLevel)}%"
                                        ></div>
                                    </div>
                                    <p class="mt-1 text-[11px] text-gray-500">
                                        {data.level.wordsToNext} words → level {data.level.level + 1}
                                    </p>
                                </div>
                            {:else}
                                <p class="pb-1 text-[12px] text-gray-500">2,500+ words</p>
                            {/if}
                        </div>
                    </div>

                    <!-- Daily goal mini card -->
                    <div
                        class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition duration-200 hover:border-white/[0.1] sm:col-span-2 lg:col-span-8"
                    >
                        <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
                            <div
                                class="relative mx-auto h-[4.75rem] w-[4.75rem] shrink-0 rounded-full p-[3px] transition duration-300 sm:mx-0"
                                style="background: conic-gradient(from -90deg, var(--color-brand) 0deg {(dailyRingPct / 100) * 360}deg, rgba(255,255,255,0.08) {(dailyRingPct / 100) * 360}deg 360deg)"
                                aria-hidden="true"
                            >
                                <div
                                    class="flex h-full w-full flex-col items-center justify-center rounded-full bg-[var(--surface-1)]"
                                >
                                    <span class="text-lg font-bold tabular-nums text-white"
                                        >{data.todayWords}</span
                                    >
                                    <span class="text-[10px] text-gray-500"
                                        >of {data.dailyWordGoal}</span
                                    >
                                </div>
                            </div>
                            <div class="min-w-0 flex-1 text-center sm:text-left">
                                <div class="flex items-center justify-center gap-2 text-[12px] font-medium uppercase tracking-wide text-gray-500 sm:justify-start">
                                    <Target class="h-4 w-4 text-brand/80" strokeWidth={2} />
                                    Today’s goal
                                </div>
                                <p class="mt-1 text-[15px] text-gray-300">
                                    {#if remaining > 0}
                                        {remaining} more {remaining === 1 ? "word" : "words"} to reach today’s target.
                                    {:else}
                                        You’ve hit your goal for today — nice work.
                                    {/if}
                                </p>
                                <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06] sm:max-w-md">
                                    <div
                                        class="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand transition-all duration-500"
                                        style="width: {dailyRingPct}%"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Main chart + category mix -->
            <div class="mb-8 grid gap-6 lg:grid-cols-12 lg:gap-8">
                <section class="lg:col-span-8">
                    <div
                        class="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 lg:p-6"
                    >
                        <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 class="text-lg font-semibold tracking-tight text-white lg:text-[1.125rem]">
                                    Activity by period
                                </h2>
                                <p class="mt-1 text-[13px] text-gray-500">
                                    Words added, split by part of speech
                                </p>
                            </div>
                            <div
                                class="flex rounded-xl bg-white/[0.04] p-1"
                                role="tablist"
                            >
                                {#each tabs as tab}
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={activeTab === tab.id}
                                        class="min-h-10 flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 {activeTab ===
                                        tab.id
                                            ? 'bg-[var(--surface-1)] text-white shadow-sm ring-1 ring-white/[0.08]'
                                            : 'text-gray-500 hover:text-gray-300'}"
                                        onclick={() => (activeTab = tab.id)}
                                    >
                                        {tab.label}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <div class="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.05] pb-5">
                            <div>
                                <p class="text-3xl font-semibold tabular-nums text-white">{periodSum}</p>
                                <p class="text-[13px] text-gray-500">{periodLabel}</p>
                            </div>
                            <p class="text-[14px] font-medium text-brand/90">
                                ~{periodAvg < 10 ? periodAvg.toFixed(1) : periodAvg.toFixed(0)} / day avg
                            </p>
                        </div>

                        <div class="flex h-40 items-end justify-between gap-1.5 sm:h-44 lg:h-48 lg:gap-2">
                            {#each barSeries as b}
                                {@const t = b.total}
                                <div
                                    class="group relative flex min-w-0 flex-1 flex-col justify-end"
                                >
                                    <div
                                        class="relative w-full overflow-hidden rounded-t-md bg-white/[0.04]"
                                        style="height: {t ? Math.max(8, (t / barMax) * 100) : 6}%"
                                    >
                                        <div
                                            class="absolute inset-0 flex flex-col-reverse justify-end"
                                        >
                                            {#if t > 0}
                                                {#each (["noun", "verb", "adjective", "adverb"] as PosKey[]) as k}
                                                    {@const c = b[k]}
                                                    {#if c > 0}
                                                        <div
                                                            class="w-full shrink-0 opacity-95 transition group-hover:opacity-100 {posMeta[k].class}"
                                                            style="height: {(c / t) * 100}%"
                                                        ></div>
                                                    {/if}
                                                {/each}
                                            {:else}
                                                <div class="h-1 w-full bg-white/[0.06]"></div>
                                            {/if}
                                        </div>
                                    </div>
                                    <p
                                        class="mt-2 text-center text-[11px] leading-tight text-gray-500 sm:text-xs"
                                    >
                                        {b.label}
                                    </p>
                                    <div
                                        class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border border-white/[0.1] bg-[var(--surface-1)] px-2.5 py-1.5 text-[11px] text-gray-200 opacity-0 shadow-lg transition group-hover:opacity-100"
                                    >
                                        {formatHoverDate(b.periodStart)} · {b.total} words
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <div
                            class="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-gray-500"
                        >
                            {#each Object.entries(posMeta) as [k, v] (k)}
                                <div class="flex items-center gap-2">
                                    <span class="h-2.5 w-2.5 shrink-0 rounded-sm {v.class}"></span>
                                    {v.label}
                                </div>
                            {/each}
                        </div>
                    </div>
                </section>

                <aside class="space-y-6 lg:col-span-4">
                    <div
                        class="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 lg:p-6"
                    >
                        <h2 class="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
                            <BarChart2 class="h-5 w-5 text-brand/70" strokeWidth={2} />
                            Vocabulary mix
                        </h2>
                        <p class="mt-1 text-[13px] text-gray-500">All-time by primary sense</p>
                        <div class="relative mx-auto mt-6 h-36 w-36">
                            <div
                                class="h-full w-full rounded-full p-1 transition-transform duration-300 hover:scale-[1.02]"
                                style="background: {donutBackground}"
                            >
                                <div
                                    class="flex h-full w-full items-center justify-center rounded-full bg-[var(--surface-1)]"
                                >
                                    <div class="text-center">
                                        <p class="text-2xl font-bold tabular-nums text-white">
                                            {posOrder.reduce((s, k) => s + data.posTotals[k], 0)}
                                        </p>
                                        <p class="text-[10px] uppercase tracking-wide text-gray-500">words</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <ul class="mt-5 space-y-2.5">
                            {#each posOrder as k}
                                <li class="flex items-center justify-between gap-3 text-[13px]">
                                    <span class="flex shrink-0 items-center gap-2 text-gray-400">
                                        <span class="h-2 w-2 shrink-0 rounded-sm {posMeta[k].class}"></span>
                                        {posMeta[k].label}
                                    </span>
                                    <span class="font-medium tabular-nums text-gray-200">{data.posTotals[k]}</span>
                                </li>
                            {/each}
                        </ul>
                    </div>
                </aside>
            </div>

            <!-- Heatmap -->
            <section class="mb-8">
                <div class="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 lg:p-6">
                    <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 class="text-lg font-semibold tracking-tight text-white lg:text-[1.125rem]">
                                Contribution map
                            </h2>
                            <p class="mt-1 text-[13px] text-gray-500">
                                {data.heatmap.totalWordsInWindow} words · {data.heatmap.activeDaysInWindow} active days · last 53 weeks
                            </p>
                        </div>
                    </div>
                    <div class="-mx-1 overflow-x-auto overflow-y-visible pb-1 pt-0.5 lg:mx-0">
                        <div class="inline-block min-w-full px-1">
                            <div
                                class="mb-2 grid justify-items-start gap-1.5"
                                style="grid-template-columns: repeat({data.heatmap.columnMonthLabels.length}, minmax(14px, 14px));"
                            >
                                {#each data.heatmap.columnMonthLabels as m}
                                    <div
                                        class="relative z-10 overflow-visible whitespace-nowrap text-left text-[10px] font-medium leading-none text-gray-500 lg:text-[11px]"
                                    >
                                        {m ?? ""}
                                    </div>
                                {/each}
                            </div>
                            <div
                                class="grid gap-1.5"
                                style="grid-template-columns: repeat({data.heatmap.columnMonthLabels.length}, minmax(14px, 14px));"
                            >
                                {#each data.heatmap.cells as row}
                                    {#each row as cell}
                                        <div
                                            class="aspect-square w-full min-h-0 rounded-[3px] transition hover:ring-1 hover:ring-brand/50 {heatLevelClass[
                                                cell.level as 0 | 1 | 2 | 3
                                            ]}"
                                            title={cell.count > 0
                                                ? `${formatHoverDate(cell.dateKey)} · ${cell.count} word${cell.count === 1 ? "" : "s"}`
                                                : formatHoverDate(cell.dateKey)}
                                        ></div>
                                    {/each}
                                {/each}
                            </div>
                        </div>
                    </div>
                    <div class="mt-4 flex flex-wrap items-center justify-end gap-2 text-[11px] text-gray-500">
                        <span>Less</span>
                        {#each [0, 1, 2, 3] as lv}
                            <div class="h-3 w-3 rounded-[2px] {heatLevelClass[lv as 0 | 1 | 2 | 3]}"></div>
                        {/each}
                        <span>More</span>
                    </div>
                </div>
            </section>

            <!-- Goal editor + milestones -->
            <div class="grid gap-6 lg:grid-cols-12 lg:gap-8">
                <section class="lg:col-span-5">
                    <div class="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 lg:p-6">
                        <h2 class="text-lg font-semibold tracking-tight text-white">Daily target</h2>
                        <p class="mt-1 text-[13px] text-gray-500">
                            How many new words you aim to capture per day (1–500).
                        </p>
                        <form
                            class="mt-5 flex flex-wrap items-end gap-3"
                            onsubmit={(e) => {
                                e.preventDefault();
                                void saveDailyGoal();
                            }}
                        >
                            <div class="min-w-0 flex-1">
                                <label for="goal" class="text-[12px] text-gray-500">Words per day</label>
                                <input
                                    id="goal"
                                    type="number"
                                    min="1"
                                    max="500"
                                    bind:value={goalInput}
                                    class="mt-1.5 w-full min-w-[5rem] max-w-[8rem] rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-[15px] text-white outline-none transition focus:border-brand/40 focus:ring-1 focus:ring-brand/30"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={goalSaving}
                                class="min-h-[46px] rounded-xl bg-brand/15 px-5 text-[14px] font-semibold text-brand transition hover:bg-brand/25 disabled:opacity-50"
                            >
                                {goalSaving ? "Saving…" : "Save"}
                            </button>
                        </form>
                    </div>
                </section>

                <section class="lg:col-span-7">
                    <div class="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 lg:p-6">
                        <h2 class="text-lg font-semibold tracking-tight text-white">Milestones</h2>
                        <p class="mt-1 text-[13px] text-gray-500">Moments worth remembering</p>
                        <ul class="relative mt-5 space-y-0 border-l border-white/[0.08] pl-5">
                            {#if data.milestones.length === 0}
                                <li class="text-[14px] text-gray-500">
                                    Keep adding words to unlock milestones here.
                                </li>
                            {:else}
                                {#each data.milestones as m}
                                    <li class="relative pb-6 pl-4 last:pb-0 sm:pl-5">
                                        <div
                                            class="absolute -left-[5px] top-1.5 z-0 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-[var(--surface-0)]"
                                        ></div>
                                        <div class="relative z-10 min-w-0">
                                            <p class="text-[14px] font-medium text-gray-100">{m.title}</p>
                                            <p class="mt-0.5 text-[13px] text-gray-400">{m.detail}</p>
                                            <p class="mt-1 text-[11px] text-gray-600">{formatMilestoneDate(m.at)}</p>
                                        </div>
                                    </li>
                                {/each}
                            {/if}
                        </ul>
                    </div>
                </section>
            </div>

            <!-- Mobile: collapsible deep-dive optional - details for mix on smallest screens -->
            <details class="mt-6 group rounded-2xl border border-white/[0.06] bg-white/[0.02] lg:hidden">
                <summary
                    class="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-[14px] font-medium text-gray-300 [&::-webkit-details-marker]:hidden"
                >
                    Chart tips
                    <ChevronDown class="h-4 w-4 text-gray-500 transition group-open:rotate-180" />
                </summary>
                <p class="border-t border-white/[0.05] px-4 py-3 text-[13px] leading-relaxed text-gray-500">
                    Tap a bar to hover on desktop. Each color is a part of speech. Your streak rewards showing up — consistency beats intensity.
                </p>
            </details>
        {/if}
    </div>
</div>
