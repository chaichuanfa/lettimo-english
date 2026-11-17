> 已停用：用户否定此方案，应用现使用 assets/mascots/fluent 中的成品逐帧动画。旧资源、生成器和专用测试归档于 retired/。

# 小鹦鹉 Lottie 动画

四种矢量姿态已接入 `Mascot`，主页与各学习页共用。

- reading：低头看书、轻抬书页、眨眼。
- listening：抬翅听音、侧头、收翅。
- teaching：举起教棒、停留、自然放下。
- cheer：展开双翅、停留、自然收回。

第二版重做动作曲线：60 fps、4.8 秒。各动作使用连续的五次缓动曲线，羽尖略晚跟随肩部；头部绕颈部转动。眼皮覆盖完整的眼白与瞳孔，书页弯曲，去掉了瞳孔压缩、书页负缩放、身体拉伸与反复扇翅。四种姿态的眨眼时机错开。

源文件：`scripts/build-mascot-lottie.mjs`。在项目根目录执行 `node scripts/build-mascot-lottie.mjs` 可重新生成 `assets/mascots/lottie/` 下的四份 JSON 和配套首帧 SVG。

页面内进入视口时播放一次，点击角色可以重播；离开视口暂停，遵循系统“减少动态效果”设置，播放器或数据加载失败时显示静态 SVG。

新版连续预览：`output/playwright/mascot-v2-60fps.mp4`（288 帧，4.8 秒）与 `output/playwright/mascot-v2-60fps.webp`（相同时间轴，静止帧由编码器合并）。原 `mascot-preview.gif` 是第一版的旧预览，不代表当前页面效果。

验证：`npm run check`，47 项单元测试与 44 项端到端测试通过。新回归用例检查眼睛和祖先图层的比例固定，确保不再通过缩放眨眼。全新 Chrome 会话中四个角色同时播放，4.8 秒内采样 569 个 RAF 回调，中位间隔 8.3 ms、P95 9.2 ms，1 次超过 34 ms；此数据仅代表本机环境。
