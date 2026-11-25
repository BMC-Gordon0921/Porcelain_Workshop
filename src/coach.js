// 新手教练卡：全游戏唯一的引导出口。
// 内容跟随真实教学状态机（move→clay→wheel→carve→paint→kiln→serve），
// 玩家在世界里时停在左下角；打开对应工作台面板时收成面板顶部的一条提示，做完一步自动换下一步。
// 只做表现层：不改状态机、不改评分、不加依赖。
import {TUTORIAL_STEPS} from './tutorial.js';
import {readStorage, writeStorage} from './platform/storage.js';

const OFF_KEY = 'terra-coach-off';

// 每一步在哪个面板里教学、高亮哪个控件、属于哪个工位。
export const COACH_PANEL = {clay: 'supply', wheel: 'editor', carve: 'editor', paint: 'editor', kiln: 'kiln', serve: 'review'};
export const COACH_FOCUS = {clay: '#fresh-clay', wheel: '.sculpt-canvas-wrap', carve: '.sculpt-canvas-wrap', paint: '.paint-colors', kiln: '#fire-button', serve: '#confirm-review'};
export const COACH_PLACE = {move: '岛上', clay: '取泥台', wheel: '塑形台', carve: '雕刻台', paint: '上色台', kiln: '窑炉', serve: '交付台'};
export const COACH_GOAL = {
  move: '走两步，靠近取泥台',
  clay: '走到取泥台，按 F 领取瓷泥',
  wheel: '在画布上沿边缘拖动一次',
  carve: '在画布上刻掉一小块多余瓷泥',
  paint: '选一个颜色，在器身上画一笔',
  kiln: '开始烧制，按住鼓风让指针留在带内',
  serve: '打开交付台，提交评分',
};
export const COACH_GOAL_TOUCH = {
  move: '拖动左下摇杆走两步',
  clay: '走到取泥台，点「操作」领取瓷泥',
  wheel: '点「操作」打开塑形台，在画布上沿边缘拖一次',
  carve: '点「操作」打开雕刻台，刻掉一小块多余瓷泥',
  paint: '点「操作」打开上色台，选色后画一笔',
  kiln: '点「操作」打开窑炉，开始烧制并按住鼓风',
  serve: '点「操作」打开交付台，提交评分',
};

// 面板已经打开时，「现在做」不再让人走去工作台，直接指面板里的下一步动作。
const COACH_GOAL_PANEL = {
  clay: '点下方「领取完整瓷泥」',
  wheel: '在画布上沿边缘拖动一次',
  carve: '在画布上刻掉一小块多余瓷泥',
  paint: '选一个颜色，在器身上画一笔',
  kiln: '点「开始烧制」，按住鼓风让指针留在带内',
  serve: '点「提交评分」',
};

export const COACH_STEPS = TUTORIAL_STEPS.map((step, i) => ({
  ...step, index: i, total: TUTORIAL_STEPS.length, place: COACH_PLACE[step.id] || '', goal: COACH_GOAL[step.id] || '',
}));

export function coachStep(id) { return COACH_STEPS.find((s) => s.id === id) || null; }
// 面板里教的是"正在做的这一步"：上色时状态机已经跳到窑炉，提示条仍应停在 paint，
// 否则第一笔之后教学就从屏幕上消失了。
export function panelStep(panel, station, step) {
  if (!step) return null;
  if (panel === 'editor' && ['wheel', 'carve', 'paint'].includes(station)) return coachStep(station);
  return coachStep(step.id);
}
export function coachEnabled() { try { return readStorage(OFF_KEY) !== '1'; } catch { return true; } }
export function enableCoach() { try { writeStorage(OFF_KEY, '0'); } catch {} }
export function disableCoach() { try { writeStorage(OFF_KEY, '1'); } catch {} }
// 世界卡片和面板提示共用同一套内容：窄屏用 touchCopy。
const copyOf = (step, touch) => (touch && step.touchCopy) || step.copy;
const goalOf = (step, touch) => (touch && COACH_GOAL_TOUCH[step.id]) || step.goal;
const panelGoalOf = (step) => COACH_GOAL_PANEL[step.id] || step.goal;

let card = null;
let strip = null;
let focusEl = null;
let skipHandler = null;

function host() {
  if (card) return card;
  card = document.getElementById('first-workshop-hint');
  if (!card) { card = document.createElement('div'); card.id = 'first-workshop-hint'; document.getElementById('app').append(card); }
  card.classList.add('coach-card');
  card.setAttribute('role', 'status');
  return card;
}

function rail(step) {
  return '<ol class="coach-rail" aria-hidden="true">' + COACH_STEPS.map((s) => '<li class="' + (s.index < step.index ? 'done' : s.index === step.index ? 'now' : 'todo') + '"></li>').join('') + '</ol>';
}

function paintCard(step, touch) {
  const el = host();
  el.hidden = false;
  document.body.classList.add('coach-on');
  el.dataset.step = step.id;
  el.innerHTML = '<div class="coach-top"><span class="coach-count">第 ' + String(step.index + 1).padStart(2, '0') + ' / ' + String(step.total).padStart(2, '0') + ' 步</span>'
    + '<span class="coach-place">' + step.place + '</span>'
    + '<button type="button" class="coach-skip">跳过教学</button></div>'
    + rail(step)
    + '<h3 class="coach-title">' + step.title + '</h3>'
    + '<p class="coach-copy">' + copyOf(step, touch) + '</p>'
    + '<p class="coach-goal"><span>现在做</span>' + goalOf(step, touch) + '</p>';
  el.querySelector('.coach-skip').onclick = () => { disableCoach(); hideCoach(); if (skipHandler) skipHandler(); };
  clearStrip();
}

function paintStrip(step, touch) {
  const body = document.querySelector('#task-body');
  if (!body) { paintCard(step, touch); return; }
  hideCard();
  if (!strip || !strip.isConnected) {
    strip = document.createElement('div');
    strip.className = 'coach-strip';
  }
  strip.dataset.step = step.id;
  strip.innerHTML = '<span class="coach-strip-count">' + String(step.index + 1) + ' / ' + step.total + '</span>'
    + '<div class="coach-strip-text"><b>' + step.title + '</b><span>' + panelGoalOf(step) + '</span></div>'
    + '<button type="button" class="coach-strip-skip">跳过</button>';
  strip.querySelector('.coach-strip-skip').onclick = () => { disableCoach(); hideCoach(); };
  const first = body.firstElementChild;
  if (first !== strip) body.insertBefore(strip, first || null);
}

function markFocus(step, panel) {
  if (focusEl) { focusEl.classList.remove('coach-focus'); focusEl = null; }
  if (!panel || !COACH_FOCUS[step.id]) return;
  const target = document.querySelector(COACH_FOCUS[step.id]);
  if (target && target.offsetParent !== null) { target.classList.add('coach-focus'); focusEl = target; }
}
function clearStrip() {
  if (strip) { strip.remove(); strip = null; }
  if (focusEl) { focusEl.classList.remove('coach-focus'); focusEl = null; }
}
function hideCard() { if (card) card.hidden = true; document.body.classList.remove('coach-on'); }

// panel：当前打开的面板 kind（activeTask.kind），没有面板传 null。
export function renderCoach({step, panel = null, touch = false, onSkip = null} = {}) {
  skipHandler = onSkip;
  const meta = step ? coachStep(step.id) : null;
  if (!meta || !coachEnabled()) { hideCoach(); clearStrip(); if (focusEl) { focusEl.classList.remove('coach-focus'); focusEl = null; } return; }
  if (panel && COACH_PANEL[meta.id] !== panel) { hideCoach(); clearStrip(); if (focusEl) { focusEl.classList.remove('coach-focus'); focusEl = null; } return; }
  if (panel) { paintStrip(meta, touch); markFocus(meta, panel); }
  else { paintCard(meta, touch); markFocus(meta, null); }
}

export function hideCoach() {
  hideCard();
  clearStrip();
}
