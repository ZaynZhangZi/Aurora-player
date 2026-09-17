# AuroraPlayer AutoMix 3.0

AuroraPlayer 的 Rust/WASM 自动混音决策内核。它负责音频基础分析、曲目兼容度评分、转场策略选择和多首前瞻规划；浏览器播放器负责执行返回的播放计划。

## 核心原则

- 不使用歌曲 ID 生成伪 BPM、调性或能量。
- 所有分析结果都携带置信度。
- 数据不足时使用 `safe_fade`，不强行 Beatmix。
- 浏览器只并发准备当前曲、下一首和下下首，避免整张播放列表同时分析。
- Rust 负责分析和制定计划，不直接控制 DOM 或 HTMLMediaElement。
- 浏览器将音频降采样后在独立 Worker 中运行分析，结果按歌曲、音质和分析版本缓存在 IndexedDB。
- Web Audio 执行层按照统一音频时钟应用增益、三段 EQ、Bass Swap、双向滤波、节拍同步 Echo 和主输出 limiter。
- 高能量抬升可使用单小节 Loop Bridge；速度或调性不适合硬对拍时使用 Echo/Filter Out 掩蔽切换。
- 兼容度或分析置信度不足时拒绝复杂混音，自动退回 `safe_fade`。

## 转场类型

- `beat_mix`：可靠拍点、速度兼容且没有明显人声冲突。
- `loop_bridge`：在可靠小节上重复 4 次单小节 Loop，并用动态 EQ 完成能量抬升。
- `echo_filter_out`：速度、调性或人声不适合长叠加时，用节拍同步 Delay、Echo 尾音和高低通滤波退出。
- `phrase_crossfade`：段落结构可靠，但不适合长 Beatmix。
- `vocal_safe_fade`：主动寻找非人声窗口。
- `gapless`：连续专辑或明确带有 gapless 标记的内容。
- `quick_cut`：能量提升明显且存在可靠落拍点。
- `safe_fade`：缺少可靠分析数据时的保底策略。

## WASM API

- `init_wasm()`
- `engine_version_js()`
- `analyze_pcm_js(samples, sample_rate, channels)`
- `mix_score_js(current, next)`
- `choose_next_track_js(current, candidates)`
- `compute_transition_plan_v2_js(current, next)`
- `plan_track_path_js(request)`
- `run_automix_js(request)`

## 构建

```powershell
wasm-pack build --target web --release --out-dir ../../src/wasm/automix --out-name automix
```

## 测试

```powershell
cargo test --target x86_64-pc-windows-msvc
```

当前 PCM 分析器可提供 BPM、拍点、小节相位、基于 chroma/key profile 的调性、近似响度、峰值、能量曲线以及基础混入混出区域。调性不够明确时返回空值而不是猜测；人声活动检测尚未接入可靠模型，因此仍保持零置信度并自动使用更安全的转场。
