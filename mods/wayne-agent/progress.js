// wayne-mode progress under each agent row: the newest .wayne-mode-todo-*.md in the agent's repo.

import { div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { agents, panes, exec, readTextFile, checking } from "herdr";
import { parseTodo } from "./todo.js";

const STALE = 10 * 60000; // working but the list hasn't moved for this long

export function startProgress(view, cx) {
  view.progress = new Map();
  if (!checking()) cx.timer.every(5000, (cx) => load(view, cx));
}

// shortcut: one agent per repo; several sessions in one repo, or an old finished list, show as the newest file. Upgrade: see wayne-progress's filter.
function load(view, cx) {
  if (view.loadingProgress) return;
  view.loadingProgress = true;
  cx.spawn(async (cx) => {
    try {
      for (const a of agents()) {
        const cwd = panes().find((p) => p.pane === a.pane)?.cwd;
        if (!cwd || a.app !== "claude-code") { view.progress.delete(a.address); continue; }
        const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, timeout: 5000 });
        if (top.code !== 0) { view.progress.delete(a.address); continue; }
        const root = top.stdout.trim();
        // shortcut: dir is Windows-only; herdr has no readdir.
        const ls = await exec("cmd", ["/c", "dir", "/b", "/o-d", ".wayne-mode-todo-*.md"], { cwd: root, timeout: 5000 });
        const name = ls.code === 0 ? ls.stdout.split(/\r?\n/)[0]?.trim() : null;
        const text = name ? await readTextFile(`${root}/${name}`) : null;
        const steps = text ? parseTodo(text) : [];
        if (!steps.length) { view.progress.delete(a.address); continue; }
        const prev = view.progress.get(a.address);
        view.progress.set(a.address, {
          text,
          changed: prev && prev.text === text ? prev.changed : Date.now(),
          total: steps.length,
          done: steps.filter((s) => s.mark === "x" || s.mark === "skip").length,
          current: steps.find((s) => s.mark === " ")?.text ?? null,
          wait: steps.find((s) => s.mark === "wait")?.text ?? null,
        });
      }
    } catch { /* exec couldn't start: show no progress */ }
    finally { view.loadingProgress = false; cx.notify(); }
  });
}

export function progressLine(view, t, a, now) {
  const p = view.progress?.get(a.address);
  if (!p) return null;
  const stale = now - p.changed > STALE && a.status === "working";
  const text = p.wait ? `${p.done}/${p.total} 等：${p.wait}`
    : p.current ? `${p.done}/${p.total} ${p.current}${stale ? ` · ${Math.round((now - p.changed) / 60000)} 分沒動` : ""}`
    : `完成 ${p.total}/${p.total}`;
  return div().pl(16).pr(8).h(16).truncate().text_size(11)
    .text_color(p.wait || stale ? t.blocked : t.dim).child(text);
}

export const withProgress = (prog, card) => (prog ? v_flex().flex_none().child(card).child(prog) : card);
