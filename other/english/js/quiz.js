/**
 * quiz.js - 多邻国式互动答题模块（单选、词块拼句、听力辨词、即时音效反馈与 XP 奖励）
 */

const QuizEngine = {
  currentQuizIndex: 0,
  selectedOptionIndex: null,
  scrambleSelectedTokens: [],
  isQuizAnswerChecked: false,

  resetQuiz() {
    this.currentQuizIndex = 0;
    this.selectedOptionIndex = null;
    this.scrambleSelectedTokens = [];
    this.isQuizAnswerChecked = false;
    this.renderQuizView();
  },

  renderQuizView() {
    const quizzes = AppState.getLevelQuizzes();
    if (!quizzes.length) return;

    if (this.currentQuizIndex >= quizzes.length) {
      this.currentQuizIndex = 0;
    }

    const quiz = quizzes[this.currentQuizIndex];
    const quizLevelTag = document.getElementById('quizLevelTag');
    const quizIndexNum = document.getElementById('quizIndexNum');
    const quizTotalNum = document.getElementById('quizTotalNum');
    const quizQuestionTitle = document.getElementById('quizQuestionTitle');
    const quizFeedbackBox = document.getElementById('quizFeedbackBox');

    if (quizLevelTag) quizLevelTag.textContent = `${AppState.currentLevel} · Interactive Practice`;
    if (quizIndexNum) quizIndexNum.textContent = this.currentQuizIndex + 1;
    if (quizTotalNum) quizTotalNum.textContent = quizzes.length;
    if (quizQuestionTitle) quizQuestionTitle.textContent = quiz.question;
    if (quizFeedbackBox) quizFeedbackBox.style.display = 'none';

    // 测验进度条
    const track = document.getElementById('quizProgressTrack');
    if (track) {
      track.innerHTML = '';
      quizzes.forEach((_, idx) => {
        const seg = document.createElement('div');
        seg.className = 'progress-segment';
        if (idx < this.currentQuizIndex) seg.classList.add('done');
        else if (idx === this.currentQuizIndex) seg.classList.add('current');
        track.appendChild(seg);
      });
    }

    // 听力题专属音频播放按钮
    const audioArea = document.getElementById('quizAudioArea');
    if (audioArea) {
      audioArea.style.display = quiz.type === 'listen' ? 'block' : 'none';
    }

    // 切换题型视图
    const optionsArea = document.getElementById('quizOptionsArea');
    const scrambleArea = document.getElementById('quizScrambleArea');

    if (quiz.type === 'scramble') {
      if (optionsArea) optionsArea.style.display = 'none';
      if (scrambleArea) scrambleArea.style.display = 'block';
      this.renderScrambleUI(quiz);
    } else {
      if (optionsArea) optionsArea.style.display = 'grid';
      if (scrambleArea) scrambleArea.style.display = 'none';
      this.renderChoiceUI(quiz);
    }

    // 重置控制按钮状态
    const actionBtn = document.getElementById('quizActionBtn');
    if (actionBtn) {
      actionBtn.textContent = '验证答案';
      actionBtn.className = 'btn-3d btn-green';
    }
    this.isQuizAnswerChecked = false;
  },

  // 渲染单选 / 听力选项
  renderChoiceUI(quiz) {
    const area = document.getElementById('quizOptionsArea');
    if (!area) return;
    area.innerHTML = '';

    quiz.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      if (this.selectedOptionIndex === idx) btn.classList.add('selected');
      btn.innerHTML = `<span class="option-num-badge">${idx + 1}</span> <span>${opt}</span>`;
      btn.onclick = () => {
        if (this.isQuizAnswerChecked) return;
        this.selectedOptionIndex = idx;
        this.renderChoiceUI(quiz);
      };
      area.appendChild(btn);
    });
  },

  // 渲染词块拼句 UI
  renderScrambleUI(quiz) {
    const dropzone = document.getElementById('scrambleDropzone');
    const pool = document.getElementById('scramblePool');
    if (!dropzone || !pool) return;

    dropzone.innerHTML = '';
    pool.innerHTML = '';

    if (!this.scrambleSelectedTokens) this.scrambleSelectedTokens = [];

    // 组装区域
    if (this.scrambleSelectedTokens.length === 0) {
      dropzone.innerHTML = '<span style="color:#b0b8c0; font-size:14px; font-weight:700; align-self:center;">点击下方词块组装句子…</span>';
    } else {
      this.scrambleSelectedTokens.forEach((token, idx) => {
        const chip = document.createElement('span');
        chip.className = 'token-chip in-dropzone';
        chip.textContent = token;
        chip.onclick = () => {
          if (this.isQuizAnswerChecked) return;
          this.scrambleSelectedTokens.splice(idx, 1);
          this.renderScrambleUI(quiz);
        };
        dropzone.appendChild(chip);
      });
    }

    // 候选词块池
    quiz.tokens.forEach((token) => {
      const usedCount = this.scrambleSelectedTokens.filter(t => t === token).length;
      const totalCount = quiz.tokens.filter(t => t === token).length;
      const chip = document.createElement('span');
      chip.className = 'token-chip';
      if (usedCount >= totalCount) chip.classList.add('used');
      chip.textContent = token;
      chip.onclick = () => {
        if (this.isQuizAnswerChecked) return;
        this.scrambleSelectedTokens.push(token);
        this.renderScrambleUI(quiz);
      };
      pool.appendChild(chip);
    });
  },

  playQuizAudio() {
    const quizzes = AppState.getLevelQuizzes();
    const quiz = quizzes[this.currentQuizIndex];
    if (quiz && quiz.audioText) {
      speakText(quiz.audioText);
    }
  },

  handleQuizAction() {
    const quizzes = AppState.getLevelQuizzes();
    const quiz = quizzes[this.currentQuizIndex];
    const actionBtn = document.getElementById('quizActionBtn');
    if (!quiz || !actionBtn) return;

    if (!this.isQuizAnswerChecked) {
      // 检查答案
      let isCorrect = false;
      if (quiz.type === 'scramble') {
        const constructed = this.scrambleSelectedTokens.join(' ');
        isCorrect = (constructed.trim().toLowerCase() === quiz.answer.trim().toLowerCase());
      } else {
        if (this.selectedOptionIndex === null) {
          alert('请先选择一个选项！');
          return;
        }
        isCorrect = (this.selectedOptionIndex === quiz.answer);
        // 高亮选项
        const options = document.querySelectorAll('.quiz-option-btn');
        options.forEach((opt, idx) => {
          if (idx === quiz.answer) opt.classList.add('correct');
          else if (idx === this.selectedOptionIndex) opt.classList.add('wrong');
        });
      }

      // 展示反馈横幅
      const fb = document.getElementById('quizFeedbackBox');
      const fbTitle = document.getElementById('feedbackTitle');
      const fbDetail = document.getElementById('feedbackDetail');

      if (fb) {
        fb.style.display = 'flex';
        fb.className = `quiz-feedback-box ${isCorrect ? 'correct' : 'wrong'}`;
      }

      AppState.userState.quizAttempts.total++;

      if (isCorrect) {
        AppState.userState.xp += 10;
        AppState.userState.quizAttempts.correct++;
        if (fbTitle) fbTitle.textContent = '🎉 太棒了！回答正确！';
        if (fbDetail) fbDetail.textContent = '+10 XP 已入账 · ' + (quiz.explanation || '理解得很透彻！');
        AudioEngine.playSuccess();
      } else {
        AppState.userState.hearts = Math.max(1, AppState.userState.hearts - 1);
        if (fbTitle) fbTitle.textContent = '💡 差一点点，继续加油！';
        if (fbDetail) fbDetail.textContent = '正确答案是：' + (quiz.answerText || quiz.answer);
        AudioEngine.playError();
      }

      AppState.updateGlobalStatusIndicators();
      this.isQuizAnswerChecked = true;

      actionBtn.textContent = (this.currentQuizIndex + 1 < quizzes.length) ? '下一题 ➔' : '完成本次测验 🎉';
      actionBtn.className = isCorrect ? 'btn-3d btn-green' : 'btn-3d btn-outline';
    } else {
      // 进入下一题
      if (this.currentQuizIndex + 1 < quizzes.length) {
        this.currentQuizIndex++;
        this.selectedOptionIndex = null;
        this.scrambleSelectedTokens = [];
        this.isQuizAnswerChecked = false;
        this.renderQuizView();
      } else {
        AudioEngine.playFanfare();
        alert(`🏆 恭喜完成 ${AppState.currentLevel} 等级的互动测验！获得本次关卡丰厚奖励！`);
        switchTab('progress');
      }
    }
  }
};

