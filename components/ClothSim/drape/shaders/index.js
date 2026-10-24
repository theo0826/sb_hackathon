// 셰이더 모음 (이름 -> WGSL 문자열). 번들러 설정 없이 쓰려고 JS 문자열로 둠
import bind from './bind.js';
import body_push from './body_push.js';
import body_render from './body_render.js';
import cloth_render from './cloth_render.js';
import collide from './collide.js';
import common from './common.js';
import hash_clear from './hash_clear.js';
import hash_insert from './hash_insert.js';
import lambda_reset from './lambda_reset.js';
import normals from './normals.js';
import predict from './predict.js';
import push_apply from './push_apply.js';
import strain from './strain.js';
import tear from './tear.js';
import tri_dead from './tri_dead.js';
import trim_render from './trim_render.js';
import shell_side from './shell_side.js';
import velocity from './velocity.js';
import weld from './weld.js';
import xpbd from './xpbd.js';
export const SHADERS = {
  trim_render,
  bind,
  body_push,
  body_render,
  cloth_render,
  collide,
  common,
  hash_clear,
  hash_insert,
  lambda_reset,
  normals,
  predict,
  push_apply,
  strain,
  tear,
  tri_dead,
  shell_side,
  velocity,
  weld,
  xpbd,
};
