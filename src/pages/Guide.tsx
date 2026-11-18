import { PageIntro } from "../components/Mascot";
import React from "react";
import { STAGES, levelOf } from "../data";
import { resetProgress } from "../state";
import { resetVocab } from "../vocab-store";
export default function Guide() {
  let week = 0;
  const reset = () => {
    if (
      confirm(
        "确定要清空所有学习进度、星级、错词本、语法错题本和背单词记录吗？",
      )
    ) {
      resetProgress();
      resetVocab();
    }
  };
  return (
    <>
      <section className="page-head">
        <PageIntro pose="teaching">
          <p className="eyebrow">Guide</p>
          <h1>学习指南</h1>
          <p className="lead">
            自然拼读（Phonics）是英语母语国家孩子学习阅读的核心方法：建立
            <b>字母（组合）</b>与<b>发音</b>
            之间的对应关系，从而“见词能读、听音能写”。大约 75%
            以上的英语单词符合拼读规律。
          </p>
        </PageIntro>
      </section>
      <section className="block">
        <h2 className="block-title">
          学习路径总览{" "}
          <small>
            建议每天 15–20 分钟，约 {STAGES.reduce((n, s) => n + s.weeks, 0)}{" "}
            周完成
          </small>
        </h2>
        <div className="timeline">
          {STAGES.map((s) => {
            const from = week + 1;
            week += s.weeks;
            return (
              <a
                key={s.id}
                className="tl-row"
                href={`./stage/${s.id}`}
                style={{ "--lv": levelOf(s).color }}
              >
                <span className="tl-weeks">
                  第 {from}–{week} 周
                </span>
                <span className="tl-dot">{s.icon}</span>
                <span className="tl-body">
                  <b>
                    {s.id}. {s.title}
                  </b>{" "}
                  <em>{s.level}</em>
                  <span>{s.goal}</span>
                </span>
              </a>
            );
          })}
        </div>
      </section>
      <section className="block">
        <h2 className="block-title">
          每节课怎么学 <small>五步学习法</small>
        </h2>
        <ol className="steps">
          <li>
            <b>听</b>：在"发音卡片"里反复听这个音，对照发音要领模仿口型。
          </li>
          <li>
            <b>拼</b>：在"示例单词"里点<b>拼读</b>
            ，看每个字母组合依次亮起、听每个音，再听整个单词。自己跟着一起拼。
          </li>
          <li>
            <b>读</b>：遮住发音，自己先读单词，再点击核对。
          </li>
          <li>
            <b>用</b>：朗读例句，注意高亮的本课单词；可以隐藏中文挑战自己。
          </li>
          <li>
            <b>测</b>：完成 15 题的小测验，答对 10
            题即完成本课。答错的词会进入错词本，可以在“复习”里练。
          </li>
        </ol>
      </section>
      <section className="block two-col">
        <div>
          <h2 className="block-title">每周节奏建议</h2>
          <ul className="plain">
            <li>周一至周四：每天学 1 课新内容（或复习上一课）。</li>
            <li>周五：在“复习”里用"听音选词""听写拼词"综合复习本周内容。</li>
            <li>周末：用"闪卡认读"清空错词本，大声朗读本周所有例句。</li>
            <li>
              一个阶段学完后，再进入下一个阶段；觉得吃力就放慢节奏，扎实比速度重要。
            </li>
          </ul>
        </div>
        <div>
          <h2 className="block-title">中国学习者常见问题</h2>
          <ul className="plain">
            <li>
              <b>给辅音加尾音</b>：book 读成"布克-儿"、bed
              读成"白的"。辅音结尾要干净利落。
            </li>
            <li>
              <b>/æ/ 和 /ɛ/ 不分</b>：bad 和 bed 读成一样。/æ/ 嘴巴要张得更大。
            </li>
            <li>
              <b>th 读成 s 或 z</b>：think 读成 sink。一定要把舌尖放到齿间。
            </li>
            <li>
              <b>v 读成 w</b>：very 读成 wery。v 要上齿咬下唇。
            </li>
            <li>
              <b>长短音不分</b>：ship / sheep、full /
              fool。短音短而松，长音长而紧。
            </li>
            <li>
              <b>l 和 n 混淆</b>（部分方言区）：注意 n 从鼻腔出气，l
              从舌头两侧出气。
            </li>
          </ul>
        </div>
      </section>
      <section className="block">
        <h2 className="block-title">发音与音频说明</h2>
        <ul className="plain">
          <li>
            本站采用<b>美式发音</b>。<b>45 个音素</b>
            的发音来自权威词典的真人录音：40 个取自 Cambridge Dictionary
            美式音标说明页的单音素录音；Cambridge 没有单独录音的 /ɑr/ /ɔr/ /ɛr/
            /ɪr/ /juː/
            用朗文、牛津里本身只由这几个音组成的单词（are、oar、air、ear、ewe）。单词和例句的整句朗读用
            macOS 的高质量美式女声 Ava（高级）合成，所以音素和单词是两个不同的声音。少数 Ava 会读错的词（如 ox、elected、our、exit）只换了交给语音合成的写法，页面文字不变，并逐个核对过读音。
          </li>
          <li>元音直接用词典的录音，只去掉前后的静音。</li>
          <li>
            词典录辅音时都读成"辅音 +
            uh"（puh、buh、muh），这是词典为了把辅音单独念出来的读法；自然拼读要去掉这个
            uh——把 b 念成 "buh"，拼 b-a-t 时就会多出一个元音、拼不成
            bat，这是自然拼读最常见的错误。所以辅音只截取 uh
            之前的部分，不拉长、不合成：/s/ /f/ /ʃ/ /θ/ 等摩擦音约 0.2 秒；/m/
            /n/ /l/ /r/ 约 0.1–0.15 秒，/l/ /w/ /ð/ 多保留 20–60
            毫秒滑向元音的过渡（这几个音主要靠过渡听出来），但不构成一个音节。
          </li>
          <li>
            爆破音（p、b、t、d、k、g）本来就是一下短促的声音，这是正常的：p t k
            ch 保留完整的送气或摩擦，b d g 是爆破加声带振动的开头几个周期。
          </li>
          <li>
            多音节词按音节拼读时，每个音节用上面这些音素逐个读出，不让语音合成去猜
            "tle"、"ta" 这类字母串的读法（会被读成字母名或错误的音）。
          </li>
          <li>
            如果某个音频文件缺失，网站会自动改用浏览器内置的语音合成朗读。
          </li>
          <li>
            右上角"更多"菜单里的"朗读速度"可以调节所有发音的速度，点击在
            1×、0.75×、0.5× 三档间循环，适合跟读。
          </li>
          <li>
            可以离线使用：手机浏览器里"添加到主屏幕"（iPhone 在 Safari
            的分享菜单里），像 App 一样打开。第一次打开后，网页、音素和词典都已存到本机；课程单词和例句的音频播放过的会自动保存，也可以在"更多"菜单里点"下载全部课程音频"，之后没有网络也能听。
          </li>
        </ul>
      </section>
      <section className="block">
        <h2 className="block-title">词典说明</h2>
        <ul className="plain">
          <li>
            <a href="./dict">词典</a>收录约 4 万个常用词。释义来自开源英汉词典
            ECDICT，例句来自 Tatoeba 例句库（CC BY 2.0
            FR，繁体译文已转为简体），音标来自 CMU 发音词典（美式）。
          </li>
          <li>
            拼读拆解是根据词典读音自动对齐出来的：先确定这个词实际怎么读，再找出每个音对应哪几个字母。所以弱读（如
            pencil 里的 i 读
            /ə/）也会如实显示，可能和课程里按规则教的读法略有不同。
          </li>
          <li>
            课程里学过的单词和例句播放预录音频；其他单词和例句由浏览器内置的语音朗读，音色可能和课程不同。
          </li>
        </ul>
      </section>
      <section className="block">
        <h2 className="block-title">背单词说明</h2>
        <ul className="plain">
          <li>
            <a href="./words">单词</a>
            里有中考、高考、四级、六级四本词书，按词频从高到低学习；词典里点"加入生词本"的词会组成第五本。词书按
            ECDICT 的考试标签划分，不是官方大纲词表，词数会略有出入。
          </li>
          <li>
            每天先复习到期的词，再学新词。新词 5
            个一组：不问认不认识，直接出一道选义题——连着答对两次算认识，直接跳过；答错的就是生词，看单词卡片，然后当场用"看词选义"和"听音选词"各测一遍。
          </li>
          <li>
            学过的词按 1、2、4、7、15、30、60
            天的间隔复习，题型逐渐变难：看词选义 → 听音选义 →
            听音拼写。答对升一级，答错降两级；通过 60 天那一关算已掌握。
          </li>
          <li>
            进度按单词记录，换词书不会丢。开始背单词后，课程测验里答错的词也会进入这里的复习。
          </li>
          <li>词书里的词大多没有预录音频，由浏览器内置的语音朗读。</li>
        </ul>
      </section>
      <section className="block">
        <h2 className="block-title">学习数据</h2>
        <p className="hint">
          学习进度、测验星级、错词本、语法错题本和背单词记录保存在当前浏览器的本地存储中，换设备或清除浏览器数据会丢失。背单词记录可以在"单词"页导出成文件，再到另一台设备导入。
        </p>
        <button className="btn ghost" onClick={reset}>
          重置全部学习进度
        </button>
      </section>
    </>
  );
}
