<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import {
        Brain,
        Flame,
        Loader,
        X,
        Layers,
        Sparkles,
        CircleCheck,
        CircleX,
        RotateCcw,
        Trophy,
        Target,
        CircleAlert,
    } from "@lucide/svelte";
    import { toast } from "svelte-sonner";
    import ReviewQuestion from "$lib/components/ReviewQuestion.svelte";
    import type { ReviewGrade, ReviewItem, ReviewOverview } from "$lib/types";

    let { data } = $props<{ data: { overview: ReviewOverview | null } }>();

    type Stage = "overview" | "session" | "summary";
    type QueueEntry = { item: ReviewItem; retry: boolean };
    type Outcome = { item: ReviewItem; grade: ReviewGrade; correct: boolean };

    let stage = $state<Stage>("overview");
    let mode = $state<"smart" | "flashcards">("smart");
    let size = $state<5 | 10 | 20>(10);
    let starting = $state(false);
    let startError = $state("");

    let sessionId = $state<string | null>(null);
    let queue = $state<QueueEntry[]>([]);
    let index = $state(0);
    let outcomes = $state<Outcome[]>([]);
    let plannedCount = $state(0);
    let saveFailures = $state(0);
    let pendingSaves: Promise<unknown>[] = [];
    let finalOverview = $state<ReviewOverview | null>(null);
    let questionRef: { handleKey: (e: KeyboardEvent) => boolean } | null = $state(null);

    let overview = $derived(finalOverview ?? data.overview);
    let current = $derived(queue[index] ?? null);
    let answeredCount = $derived(outcomes.length);
    let correctCount = $derived(outcomes.filter((o) => o.correct).length);
    let progressPct = $derived(
        plannedCount ? Math.round((Math.min(answeredCount, plannedCount) / plannedCount) * 100) : 0,
    );
    let accuracy = $derived(answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0);
    let missed = $derived(outcomes.filter((o) => !o.correct));
    let struggled = $derived(outcomes.filter((o) => o.correct && o.grade === "hard"));

    let caughtUp = $derived(
        overview ? overview.dueNow === 0 && overview.newWords === 0 : false,
    );

    async function startSession() {
        if (starting) return;
        starting = true;
        startError = "";
        try {
            const res = await fetch("/api/review/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode, size }),
            });
            const body = (await res.json().catch(() => null)) as {
                sessionId?: string;
                items?: ReviewItem[];
                error?: string;
            } | null;
            if (!res.ok || !body?.sessionId || !body.items?.length) {
                throw new Error(body?.error ?? "Couldn't start a session. Please try again.");
            }
            sessionId = body.sessionId;
            queue = body.items.map((item) => ({ item, retry: false }));
            plannedCount = body.items.length;
            index = 0;
            outcomes = [];
            saveFailures = 0;
            pendingSaves = [];
            finalOverview = null;
            stage = "session";
        } catch (err) {
            startError = err instanceof Error ? err.message : "Something went wrong.";
        } finally {
            starting = false;
        }
    }

    async function postAnswer(wordId: string, grade: ReviewGrade, attempt = 0): Promise<void> {
        try {
            const res = await fetch("/api/review/answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, wordId, grade }),
            });
            if (!res.ok && res.status >= 500 && attempt < 1) return postAnswer(wordId, grade, attempt + 1);
            if (!res.ok) throw new Error(String(res.status));
        } catch {
            if (attempt < 1) return postAnswer(wordId, grade, attempt + 1);
            saveFailures++;
            if (saveFailures === 1) {
                toast.error("Couldn't save some answers", {
                    description: "Check your connection. Your session will continue.",
                });
            }
        }
    }

    function handleAnswer(entry: QueueEntry, r: { grade: ReviewGrade; correct: boolean }) {
        if (entry.retry) return;
        outcomes = [...outcomes, { item: entry.item, ...r }];
        pendingSaves.push(postAnswer(entry.item.wordId, r.grade));
        // Missed words come back once at the end of the session for reinforcement
        if (!r.correct) {
            queue = [...queue, { item: entry.item, retry: true }];
        }
    }

    function next() {
        if (index + 1 < queue.length) {
            index++;
        } else {
            void finish();
        }
    }

    async function finish() {
        stage = "summary";
        await Promise.allSettled(pendingSaves);
        if (!sessionId || outcomes.length === 0) return;
        try {
            const res = await fetch(`/api/review/session/${sessionId}/complete`, { method: "POST" });
            const body = (await res.json().catch(() => null)) as { overview?: ReviewOverview } | null;
            if (body?.overview) finalOverview = body.overview;
        } catch {
            /* summary still shows local results */
        }
    }

    function quit() {
        if (outcomes.length === 0) {
            stage = "overview";
            return;
        }
        void finish();
    }

    async function backToOverview() {
        stage = "overview";
        await invalidateAll();
        finalOverview = null;
    }

    function onKeydown(e: KeyboardEvent) {
        if (stage === "session") {
            if (e.key === "Escape") {
                quit();
                return;
            }
            if (questionRef?.handleKey(e)) e.preventDefault();
        }
    }

    function chipClass(active: boolean) {
        return `shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 active:scale-[0.98] touch-manipulation ${
            active
                ? "border-brand/40 bg-brand/12 text-brand"
                : "border-white/[0.08] bg-white/[0.04] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300"
        }`;
    }

    function encouragement(pct: number): { title: string; body: string } {
        if (pct >= 90) return { title: "Outstanding!", body: "These words are sticking. They'll come back less often now." };
        if (pct >= 70) return { title: "Nice work!", body: "Solid recall. A few words could use another pass." };
        if (pct >= 40) return { title: "Good effort", body: "Missed words will come back sooner so you can lock them in." };
        return { title: "Every review counts", body: "Tricky words will show up more often until they stick. Keep going!" };
    }
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
    <title>Revise · VocabVault</title>
</svelte:head>

<div class="min-h-full bg-[var(--surface-0)] text-gray-100 font-sans selection:bg-brand-darker/40 selection:text-white">
    <main class="mx-auto max-w-xl px-4 pt-4 pb-6 md:pt-6">
        {#if stage === "overview"}
            <h1 class="text-[1.375rem] md:text-[1.5rem] font-semibold tracking-tight text-white">Revise</h1>
            <p class="mt-0.5 text-[13px] leading-snug text-gray-500">
                Short, mixed practice. Words you find hard come back sooner, and ones you know come back less often.
            </p>

            {#if !overview || overview.totalWords === 0}
                <div class="mt-6 rounded-xl border border-dashed border-white/[0.1] px-4 py-10 text-center">
                    <Brain size={28} class="mx-auto text-gray-600" aria-hidden="true" />
                    <p class="mt-3 text-[14px] text-gray-300">Nothing to revise yet</p>
                    <p class="mt-1 text-[13px] text-gray-500">Save a few words first, then come back here.</p>
                    <div class="mt-4 flex flex-wrap justify-center gap-2">
                        <a href="/dashboard?focus=search" class="rounded-xl bg-brand-deep px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand">Look up a word</a>
                        <a href="/analyze" class="rounded-xl border border-white/[0.1] px-3.5 py-2 text-[13px] font-semibold text-gray-200 transition hover:bg-white/[0.05]">Analyze a paragraph</a>
                    </div>
                </div>
            {:else}
                <div class="mt-4 grid grid-cols-3 gap-2">
                    <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3">
                        <p class="text-[1.375rem] font-semibold tabular-nums text-white">{overview.dueNow}</p>
                        <p class="text-[12px] text-gray-500">Due now</p>
                    </div>
                    <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3">
                        <p class="text-[1.375rem] font-semibold tabular-nums text-white">{overview.newWords}</p>
                        <p class="text-[12px] text-gray-500">Not yet revised</p>
                    </div>
                    <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3">
                        <p class="text-[1.375rem] font-semibold tabular-nums text-white">{overview.mastered}</p>
                        <p class="text-[12px] text-gray-500">Mastered</p>
                    </div>
                </div>

                <p class="mt-3 flex items-center gap-2 px-1 text-[13px] text-gray-400">
                    <Flame size={15} class="shrink-0 text-brand/80" aria-hidden="true" />
                    {#if overview.reviewStreak > 0}
                        {overview.reviewStreak}-day revision streak
                        {#if overview.reviewedToday > 0}
                            · {overview.reviewedToday} reviewed today
                        {/if}
                    {:else}
                        Revise today to start a revision streak
                    {/if}
                </p>

                <section class="mt-5 rounded-2xl border border-white/[0.08] bg-[var(--surface-1)] p-4">
                    <h2 class="text-[15px] font-semibold text-white">
                        {caughtUp ? "You're all caught up" : "Ready when you are"}
                    </h2>
                    <p class="mt-0.5 text-[13px] text-gray-500">
                        {#if caughtUp}
                            Nothing is due. Practice your weakest words anyway?
                        {:else}
                            Due and new words first, then your weakest ones.
                        {/if}
                    </p>

                    <div class="mt-4 space-y-3">
                        <div>
                            <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Mode</p>
                            <div class="flex flex-wrap gap-2">
                                <button type="button" class={chipClass(mode === "smart")} onclick={() => (mode = "smart")} aria-pressed={mode === "smart"}>
                                    <span class="inline-flex items-center gap-1.5"><Sparkles size={13} aria-hidden="true" /> Smart mix</span>
                                </button>
                                <button type="button" class={chipClass(mode === "flashcards")} onclick={() => (mode = "flashcards")} aria-pressed={mode === "flashcards"}>
                                    <span class="inline-flex items-center gap-1.5"><Layers size={13} aria-hidden="true" /> Flashcards</span>
                                </button>
                            </div>
                        </div>
                        <div>
                            <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Length</p>
                            <div class="flex flex-wrap gap-2">
                                {#each [5, 10, 20] as const as n (n)}
                                    <button type="button" class={chipClass(size === n)} onclick={() => (size = n)} aria-pressed={size === n}>
                                        {n} words
                                    </button>
                                {/each}
                            </div>
                        </div>
                    </div>

                    {#if startError}
                        <p class="mt-3 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3 py-2.5 text-[13px] text-red-300" role="alert">
                            <CircleAlert size={16} class="mt-0.5 shrink-0" aria-hidden="true" />
                            {startError}
                        </p>
                    {/if}

                    <button
                        type="button"
                        onclick={() => void startSession()}
                        disabled={starting}
                        class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-brand active:scale-[0.99] touch-manipulation disabled:opacity-60"
                    >
                        {#if starting}
                            <Loader size={18} class="animate-spin" aria-hidden="true" /> Preparing…
                        {:else}
                            <Brain size={18} aria-hidden="true" /> {caughtUp ? "Practice anyway" : "Start revision"}
                        {/if}
                    </button>
                </section>

                {#if overview.needsPractice.length}
                    <section class="mt-6">
                        <h2 class="text-[1.125rem] font-semibold tracking-tight text-white">Needs practice</h2>
                        <p class="mt-0.5 text-[12px] text-gray-500">Words you've missed recently. They'll show up more often.</p>
                        <div class="mt-3 flex flex-wrap gap-2">
                            {#each overview.needsPractice as w (w.id)}
                                <span class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-3 py-1.5 text-[12px] font-medium capitalize text-amber-100">
                                    {w.word}
                                    {#if w.accuracy !== null}
                                        <span class="text-[11px] normal-case tabular-nums text-amber-300/70">{w.accuracy}%</span>
                                    {/if}
                                </span>
                            {/each}
                        </div>
                    </section>
                {/if}

                {#if overview.lastSession}
                    <p class="mt-6 px-1 text-[12px] text-gray-500">
                        Last session: {overview.lastSession.correct}/{overview.lastSession.answered} correct
                    </p>
                {/if}
            {/if}
        {:else if stage === "session" && current}
            <div class="mb-4 flex items-center gap-3">
                <button
                    type="button"
                    onclick={quit}
                    class="rounded-lg p-2 text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-200"
                    aria-label="End session (progress is saved)"
                    title="End session. Progress is saved."
                >
                    <X size={20} strokeWidth={2} />
                </button>
                <div
                    class="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={plannedCount}
                    aria-valuenow={Math.min(answeredCount, plannedCount)}
                    aria-label="Session progress"
                >
                    <div class="h-full rounded-full bg-brand transition-[width] duration-300" style="width: {progressPct}%"></div>
                </div>
                <span class="w-12 text-right text-[12px] tabular-nums text-gray-500">
                    {Math.min(answeredCount + (current.retry ? 0 : 1), plannedCount)}/{plannedCount}
                </span>
            </div>

            {#key index}
                <ReviewQuestion
                    bind:this={questionRef}
                    item={current.item}
                    retry={current.retry}
                    onanswer={(r: { grade: ReviewGrade; correct: boolean }) => handleAnswer(current, r)}
                    oncontinue={next}
                />
            {/key}

            <p class="mt-3 text-center text-[12px] tabular-nums text-gray-600">
                {correctCount} correct · {answeredCount - correctCount} missed
            </p>
        {:else if stage === "summary"}
            {@const msg = encouragement(accuracy)}
            <div class="rounded-2xl border border-white/[0.08] bg-[var(--surface-1)] p-5 text-center">
                <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                    {#if accuracy >= 70}
                        <Trophy size={24} aria-hidden="true" />
                    {:else}
                        <Target size={24} aria-hidden="true" />
                    {/if}
                </div>
                <h1 class="mt-3 text-[1.375rem] font-semibold tracking-tight text-white">
                    {answeredCount === 0 ? "Session ended" : msg.title}
                </h1>
                {#if answeredCount > 0}
                    <p class="mt-1 text-[13px] text-gray-400">{msg.body}</p>
                    <div class="mt-5 grid grid-cols-3 gap-2">
                        <div class="rounded-xl bg-white/[0.03] px-2 py-3">
                            <p class="text-[1.25rem] font-semibold tabular-nums text-white">{answeredCount}</p>
                            <p class="text-[11px] text-gray-500">Revised</p>
                        </div>
                        <div class="rounded-xl bg-white/[0.03] px-2 py-3">
                            <p class="text-[1.25rem] font-semibold tabular-nums text-emerald-300">{correctCount}</p>
                            <p class="text-[11px] text-gray-500">Correct</p>
                        </div>
                        <div class="rounded-xl bg-white/[0.03] px-2 py-3">
                            <p class="text-[1.25rem] font-semibold tabular-nums text-white">{accuracy}%</p>
                            <p class="text-[11px] text-gray-500">Accuracy</p>
                        </div>
                    </div>
                    {#if finalOverview && finalOverview.reviewStreak > 0}
                        <p class="mt-4 inline-flex items-center gap-1.5 text-[13px] text-gray-300">
                            <Flame size={15} class="text-brand" aria-hidden="true" />
                            {finalOverview.reviewStreak}-day revision streak
                        </p>
                    {/if}
                    {#if saveFailures > 0}
                        <p class="mt-3 text-[12px] text-amber-300/80">
                            {saveFailures} {saveFailures === 1 ? "answer" : "answers"} couldn't be saved.
                        </p>
                    {/if}
                {:else}
                    <p class="mt-1 text-[13px] text-gray-400">No answers were recorded.</p>
                {/if}
            </div>

            {#if missed.length || struggled.length}
                <section class="mt-5">
                    <h2 class="text-[1.125rem] font-semibold tracking-tight text-white">Revisit these</h2>
                    <ul class="mt-3 space-y-2">
                        {#each [...missed, ...struggled] as o (o.item.wordId)}
                            <li class="flex gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-3">
                                {#if o.correct}
                                    <CircleCheck size={18} class="mt-0.5 shrink-0 text-amber-300" aria-label="Struggled" />
                                {:else}
                                    <CircleX size={18} class="mt-0.5 shrink-0 text-red-300" aria-label="Missed" />
                                {/if}
                                <div class="min-w-0">
                                    <p class="text-[15px] font-semibold capitalize text-gray-100">{o.item.word}</p>
                                    <p class="mt-0.5 text-[13px] leading-relaxed text-gray-400">{o.item.meaning}</p>
                                </div>
                            </li>
                        {/each}
                    </ul>
                </section>
            {:else if answeredCount > 0}
                <p class="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] px-4 py-3 text-center text-[13px] text-emerald-200">
                    You got every word right. 🎉
                </p>
            {/if}

            <div class="mt-5 grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onclick={() => void backToOverview()}
                    class="rounded-xl border border-white/[0.1] px-4 py-3 text-[14px] font-semibold text-gray-200 transition hover:bg-white/[0.05] touch-manipulation"
                >
                    Done
                </button>
                <button
                    type="button"
                    onclick={() => void startSession()}
                    disabled={starting}
                    class="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-brand touch-manipulation disabled:opacity-60"
                >
                    {#if starting}
                        <Loader size={16} class="animate-spin" aria-hidden="true" />
                    {:else}
                        <RotateCcw size={16} aria-hidden="true" />
                    {/if}
                    Revise more
                </button>
            </div>
        {/if}
    </main>
</div>
