export function mobileGuidance({blocked,action,next}) {
 if(blocked)return '🔒 暂不可用 · '+blocked;
 if(action)return action;
 return next?'下一步 · '+next:'';
}
