/* =============================================================
   副担任 mirAI NEXT - app.js  (v4.0)
   - SPA navigation
   - Demo auth (teacher / student)
   - Wizard (prepare → generate → review → slide → save)
   - Slide engine + PDF export (jsPDF)
   - Implement log → Effects dashboard (Chart.js)
   - Career simulator
   - Student curriculum
   - mirAI chat (local + OpenAI), teacher view of student chat logs
   ============================================================= */

(function () {
  'use strict';

  // ============================================================
  // Demo accounts
  // ============================================================
  const TEACHERS = {
    'suzuki@demo.jp': { pwd: 'demo123', name: '鈴木 先生', subject: '情報科', initial: '鈴' },
    'tanaka@demo.jp': { pwd: 'demo123', name: '田中 先生', subject: '数学科', initial: '田' },
    'yamada@demo.jp': { pwd: 'demo123', name: '山田 先生', subject: '探究主任', initial: '山' },
    'teacher@demo.jp': { pwd: 'demo123', name: 'デモ 先生', subject: '情報科', initial: 'デ' },
  };
  const STUDENTS = {
    'sakura@demo.jp': { pwd: 'demo123', name: '佐藤 さくら', cls: '2年A組', initial: '桜', grade: 2 },
    'kenta@demo.jp':  { pwd: 'demo123', name: '高橋 健太',   cls: '2年B組', initial: '健', grade: 2 },
    'mio@demo.jp':    { pwd: 'demo123', name: '伊藤 美緒',   cls: '3年A組', initial: '美', grade: 3 },
    'student@demo.jp':{ pwd: 'demo123', name: 'デモ 生徒',   cls: '2年A組', initial: 'デ', grade: 2 },
  };

  // ============================================================
  // Global State
  // ============================================================
  const State = {
    view: 'landing',
    user: null,         // { role, email, name, ...}
    teacherPage: 'home',
    studentPage: 'home',

    // wizard
    wizardStep: 1,
    formData: {},
    generated: { plan: '', material: '', rubric: '' },
    edited:    { plan: '', material: '', rubric: '' },
    approved:  { plan: false, material: false, rubric: false },
    currentTab: 'plan',
    slides: [],
    slideIndex: 0,

    // lessons (teacher-stored)
    lessons: [],
    activeLessonId: null,
    activeImplementId: null,

    // chat
    chatMessages: { teacher: [], student: [] },
    apiMode: { teacher: false, student: false },
    apiKey:  { teacher: '', student: '' },

    // career
    interests: new Set(),

    // charts
    charts: {},
  };

  // ============================================================
  // Curriculum templates (read-only for students)
  // ============================================================
  const CURRICULUM = [
    {
      id: 'c1', title: '情報II｜AIと社会データの読み解き', tag: '情報II',
      img: 'assets/img/dashboard.jpg',
      desc: '生成AIの仕組みを学び、公開データから社会課題を発見・分析する力を養う単元。',
      progress: 72, lessons: 8, materials: 12,
    },
    {
      id: 'c2', title: '探究｜地域とつながる課題発見', tag: '総合的な探究',
      img: 'assets/img/students_active.jpg',
      desc: '地域の現状をリサーチし、高校生視点での解決アイデアを提案する半期プロジェクト。',
      progress: 45, lessons: 12, materials: 18,
    },
    {
      id: 'c3', title: 'データ活用｜統計から見つけるビジネスの種', tag: '数学・情報',
      img: 'assets/img/teachers.jpg',
      desc: '統計データの読み取りを通じて、社会課題とビジネスチャンスを構造化する。',
      progress: 28, lessons: 6, materials: 9,
    },
    {
      id: 'c4', title: '英語｜世界に伝えるプレゼン入門', tag: '英語表現',
      img: 'assets/img/presentation.jpg',
      desc: '英語でアイデアを伝えるための構成・表現・発表テクニックを身につける。',
      progress: 60, lessons: 5, materials: 7,
    },
    {
      id: 'c5', title: 'キャリア｜未来の自分をデザイン', tag: 'キャリア教育',
      img: 'assets/img/career.jpg',
      desc: '自分の興味と社会の選択肢をつなげ、3年間の学びをキャリアに結びつける。',
      progress: 35, lessons: 4, materials: 6,
    },
    {
      id: 'c6', title: '協働｜チームで創るプロジェクト学習', tag: 'PBL',
      img: 'assets/img/student_chat.jpg',
      desc: '少人数チームでアイデアを形にし、発表・改善のサイクルを体験する。',
      progress: 50, lessons: 7, materials: 10,
    },
  ];

  // ============================================================
  // Career database
  // ============================================================
  const INTERESTS = [
    { id: 'tech', label: 'テクノロジー', emoji: '💻' },
    { id: 'data', label: 'データ・分析', emoji: '📊' },
    { id: 'design', label: 'デザイン・芸術', emoji: '🎨' },
    { id: 'social', label: '人と社会', emoji: '🤝' },
    { id: 'medical', label: '医療・健康', emoji: '🏥' },
    { id: 'business', label: 'ビジネス・経営', emoji: '💼' },
    { id: 'global', label: 'グローバル・言語', emoji: '🌏' },
    { id: 'science', label: '研究・科学', emoji: '🔬' },
    { id: 'edu', label: '教育・人を育てる', emoji: '📚' },
    { id: 'eco', label: '環境・エコ', emoji: '🌱' },
    { id: 'sport', label: 'スポーツ・体', emoji: '⚽' },
    { id: 'create', label: 'ものづくり', emoji: '🛠️' },
  ];

  const CAREERS = [
    { id:'ai_eng', title:'AIエンジニア', match:['tech','data','science'],
      desc:'AI技術を使って課題を解く仕事。社会のデータを読み解き、新しいプロダクトをつくる。',
      skills:['プログラミング','数学','英語','問題発見力'],
      path:'高校：情報II・数学を強化 → 大学：情報工学・数理科学 → インターン経験' },
    { id:'data_sci', title:'データサイエンティスト', match:['data','science','business'],
      desc:'ビッグデータから意思決定の根拠を導く。マーケティング、医療、行政まで活躍領域は広い。',
      skills:['統計学','SQL','Python','ビジネス感覚'],
      path:'高校：データ分析の探究 → 大学：統計・情報・経済 → 企業データ分析業務' },
    { id:'designer', title:'UI/UXデザイナー', match:['design','tech','create'],
      desc:'人が使うものを「使いやすく」「楽しく」する仕事。デジタルプロダクトに不可欠。',
      skills:['観察力','図解','コラボ','ツール（Figma等）'],
      path:'高校：美術＋情報 → 大学/専門：デザイン学・情報デザイン → ポートフォリオ作成' },
    { id:'doctor', title:'医師・看護師', match:['medical','science','social'],
      desc:'人の命と健康に寄り添う仕事。専門性と人間理解、両方が必要。',
      skills:['理科基礎','コミュニケーション','倫理観','体力'],
      path:'高校：化学・生物強化 → 医学部・看護学部 → 国家資格 → 臨床経験' },
    { id:'startup', title:'起業家・スタートアップ', match:['business','tech','create'],
      desc:'新しい価値を世に届ける挑戦者。小さな問いから事業を生み育てる。',
      skills:['課題発見','行動力','チームビルド','学び続ける姿勢'],
      path:'高校：探究で課題発見の練習 → 大学：ビジネス・テクノロジー → 学生起業/インターン' },
    { id:'teacher', title:'教育者・先生', match:['edu','social','science'],
      desc:'人の成長に深く関わる仕事。学び方の進化とともに、教師の役割も広がっている。',
      skills:['伝える力','聴く力','専門教科','柔軟性'],
      path:'高校：得意教科を深掘り → 教育学部または教科専門 → 教員免許 → 実習' },
    { id:'designer_art', title:'クリエイター（映像・音楽）', match:['design','create','global'],
      desc:'物語や体験を世界に届ける仕事。テクノロジーで広がる新しい表現も。',
      skills:['表現力','構成力','技術','発信力'],
      path:'高校：作品づくり開始 → 美大/専門/独学 → SNS発信 → 業界デビュー' },
    { id:'researcher', title:'研究者・科学者', match:['science','data','medical','tech'],
      desc:'未知を解き明かす仕事。粘り強い問いと、社会への貢献が両立する。',
      skills:['論理的思考','英語論文読解','実験','根気'],
      path:'高校：理科・数学に没頭 → 大学・大学院 → 学会発表 → ポスドク' },
    { id:'global', title:'国際協力・外交', match:['global','social','business'],
      desc:'言語と文化の橋渡し。国際機関、商社、NGOなど活躍の場は多い。',
      skills:['語学','歴史・地理','交渉力','異文化理解'],
      path:'高校：英語＋第二外国語 → 国際系学部 → 留学経験 → 専門資格' },
    { id:'eco_sci', title:'環境エンジニア・サステナ専門家', match:['eco','science','business','tech'],
      desc:'地球と人の未来を両立させる仕事。エネルギー、農業、都市計画など多領域。',
      skills:['理科基礎','データ分析','政策理解','長期視点'],
      path:'高校：生物・化学・地学 → 環境系・工学部 → 専門資格・現場経験' },
    { id:'pro_athlete', title:'スポーツ／健康専門職', match:['sport','medical','social'],
      desc:'人のパフォーマンスを最大化する仕事。指導、トレーナー、栄養士、研究者など。',
      skills:['実技','身体科学','コーチング','データ活用'],
      path:'高校：競技と勉強の両立 → 体育・スポーツ科学 → 専門資格 → 現場経験' },
    { id:'craftsman', title:'ものづくり職人・エンジニア', match:['create','tech','science','sport'],
      desc:'手と頭で価値を生む仕事。匠の技と最新技術が融合する時代。',
      skills:['観察','根気','技術習得','チームワーク'],
      path:'高校：実技や工作経験 → 工業系・専門・大学 → 現場研修 → 資格取得' },
  ];

  // ============================================================
  // Presets for wizard
  // ============================================================
  const PRESETS = {
    info2: {
      theme: '生成AIを使ったデータ分析と社会課題発見', grade: '高校2年',
      subject: '情報II', duration: '2コマ（100分）', students: 32,
      goal: '生成AIの仕組みを理解し、公開データから社会課題を発見・分析する力を身につける。AI利用の倫理・著作権の観点も学ぶ。',
      rubric: 'A：独自視点で社会課題を発見・データを根拠に提案できる / B：AIを適切に活用しデータから示唆を読み取れる / C：基本操作と倫理ポイントを理解している',
    },
    inquiry: {
      theme: '地域課題を発掘する探究学習：地元と高校生の交差点', grade: '高校2年',
      subject: '総合的な探究の時間', duration: '6コマ（半期）', students: 36,
      goal: '地域の現状・課題を多角的にリサーチし、高校生視点での解決アイデアを企画書としてまとめる。',
      rubric: 'A：オリジナルの解決提案を企画書として提示できる / B：地域データと住民の声を統合して分析できる / C：地域の特徴を整理して言語化できる',
    },
    data: {
      theme: '統計データから読み解く社会課題とビジネスチャンス', grade: '高校3年',
      subject: '数学（データの活用）', duration: '3コマ（150分）', students: 32,
      goal: '統計データの読み取り・分析を通じて社会課題を発見し、解決のためのビジネスアイデアを構築する。',
      rubric: 'A：複数データを統合し論理的なビジネス提案ができる / B：統計指標を正しく解釈し示唆を得られる / C：基本統計の読み取りができる',
    },
    english: {
      theme: '英語で発信する：自分の探究を世界に伝える', grade: '高校2年',
      subject: '英語表現', duration: '4コマ（200分）', students: 30,
      goal: '自分の探究テーマを英語で構成し、3分間のプレゼンテーションを完成させる。',
      rubric: 'A：論理構成・表現・発音すべて高水準 / B：基本構成と要点を英語で伝えられる / C：用意した原稿を読み上げ理解させられる',
    },
  };

  // ============================================================
  // Demo student chat logs (for teacher's view)
  // ============================================================
  const STUDENT_CHAT_LOGS = [
    { student: '佐藤 さくら', cls: '2年A組', topic: 'career', tag: '進路相談', time: '今日 14:32',
      snippet: '医療系に興味があるけど、まだ理系か文系か決められない。どう考えたらいい？',
      aiReply: 'まずは「人と関わる仕事の中で何にワクワクするか」を3つ挙げてみよう。医療には研究・臨床・支援などいろんな関わり方があるよ。' },
    { student: '高橋 健太', cls: '2年B組', topic: 'study', tag: '学習相談', time: '今日 13:18',
      snippet: '数IIBの確率分布が全然わからない…。どこから手を付ければいい？',
      aiReply: '土台になる「場合の数→確率→確率変数」の順で2問ずつ解いてみよう。例題で1日10分でも積み重ねが効くよ。' },
    { student: '伊藤 美緒', cls: '3年A組', topic: 'worry', tag: '悩みごと', time: '昨日 18:45',
      snippet: '受験勉強と部活の両立が辛い。やめるべきか悩んでいる。',
      aiReply: '「両立できない理由」を3つ書き出してみよう。問題が見えると選択肢も増える。担任の先生にも相談してみるのもおすすめ。' },
    { student: '佐藤 さくら', cls: '2年A組', topic: 'study', tag: '学習相談', time: '昨日 17:02',
      snippet: '探究のテーマで「地域の魅力発信」を考えてるけど、もっと具体にしたい。',
      aiReply: '対象を絞ってみよう（年代別／時間帯別／観光客と地元）。一つに絞ると、データも集めやすくなるよ。' },
    { student: '高橋 健太', cls: '2年B組', topic: 'career', tag: '進路相談', time: '2日前 12:30',
      snippet: 'スポーツに関わる仕事ってどんな選択肢がある？',
      aiReply: 'プレイヤー、コーチ、トレーナー、栄養士、データアナリスト、スポーツ用品の開発者など。「人の成長」か「データ」か、自分の興味を絞ると見えやすい。' },
    { student: '伊藤 美緒', cls: '3年A組', topic: 'career', tag: '進路相談', time: '3日前 16:15',
      snippet: '志望理由書の書き出しが思いつかない。どうしたらいい？',
      aiReply: '「いつ、何を見て、どう感じたか」を1つだけ思い出してみよう。そのワンシーンを書くと、自分らしい志望理由になるよ。' },
  ];

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    // restore lesson list from localStorage
    try {
      const ls = JSON.parse(localStorage.getItem('mirai_lessons') || '[]');
      if (Array.isArray(ls)) State.lessons = ls;
    } catch (_) {}

    // restore API keys
    State.apiKey.teacher = localStorage.getItem('mirai_api_teacher') || '';
    State.apiKey.student = localStorage.getItem('mirai_api_student') || '';

    initLanding();
    initWizard();
    initInterests();
    initCurriculum();
    initApiInputs();
    showView('landing');
  });

  // ============================================================
  // View routing
  // ============================================================
  window.showView = function (view) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const el = document.getElementById('view-' + view);
    if (el) {
      el.classList.remove('hidden');
      State.view = view;
      window.scrollTo(0, 0);
      // close sidebar on view switch
      document.querySelectorAll('.app-sidebar').forEach(s => s.classList.remove('open'));
    }
  };

  window.toggleSidebar = function () {
    const sb = State.view === 'teacher-app' ? document.getElementById('teacherSidebar') : document.getElementById('studentSidebar');
    if (sb) sb.classList.toggle('open');
  };

  // ============================================================
  // Auth
  // ============================================================
  window.fillLogin = function (role, email, pwd) {
    if (role === 'teacher') {
      document.getElementById('teacherEmail').value = email;
      document.getElementById('teacherPassword').value = pwd;
    } else {
      document.getElementById('studentEmail').value = email;
      document.getElementById('studentPassword').value = pwd;
    }
  };

  window.handleLogin = function (e, role) {
    e.preventDefault();
    const emailEl = document.getElementById(role + 'Email');
    const pwdEl = document.getElementById(role + 'Password');
    const errEl = document.getElementById(role + 'LoginError');
    const email = emailEl.value.trim().toLowerCase();
    const pwd = pwdEl.value;
    const db = role === 'teacher' ? TEACHERS : STUDENTS;
    const user = db[email];
    if (!user || user.pwd !== pwd) {
      errEl.textContent = '⚠ メールアドレスまたはパスワードが正しくありません。下記のデモアカウントをご利用ください。';
      errEl.classList.remove('hidden');
      return false;
    }
    errEl.classList.add('hidden');
    State.user = { role, email, ...user };
    if (role === 'teacher') {
      mountTeacherApp();
      showView('teacher-app');
    } else {
      mountStudentApp();
      showView('student-app');
    }
    showToast(`ようこそ、${user.name}！`, 'success');
    return false;
  };

  window.logout = function () {
    State.user = null;
    showView('landing');
    showToast('ログアウトしました', 'info');
  };

  // ============================================================
  // Mount Teacher app
  // ============================================================
  function mountTeacherApp() {
    document.getElementById('teacherName').textContent = State.user.name;
    document.getElementById('teacherRole').textContent = State.user.subject;
    document.getElementById('teacherAvatar').textContent = State.user.initial;
    document.getElementById('teacherWelcome').textContent = `おかえりなさい、${State.user.name}`;
    renderTeacherHome();
    switchTeacherPage('home');
  }

  window.switchTeacherPage = function (page) {
    State.teacherPage = page;
    document.querySelectorAll('#view-teacher-app .sidebar-link').forEach(l => l.classList.remove('active'));
    const idx = ['home','prepare','implement','effects','progress','chatlogs','chat'].indexOf(page);
    const links = document.querySelectorAll('#view-teacher-app .sidebar-link');
    if (links[idx]) links[idx].classList.add('active');

    document.querySelectorAll('.teacher-page').forEach(p => p.classList.add('hidden'));
    const target = document.querySelector(`.teacher-page[data-page="${page}"]`);
    if (target) target.classList.remove('hidden');

    if (page === 'home') renderTeacherHome();
    if (page === 'implement') renderImplementList();
    if (page === 'effects') renderEffectsSelector();
    if (page === 'progress') renderProgressTable();
    if (page === 'chatlogs') renderChatLogs();
  };

  function renderTeacherHome() {
    const tbody = document.getElementById('teacherLessonTable');
    if (!tbody) return;
    if (State.lessons.length === 0) {
      // Seed a sample lesson so the dashboard isn't empty
      State.lessons = [
        { id: 'L001', theme: '生成AIを使ったデータ分析と社会課題発見', subject: '情報II',
          grade: '高校2年', cls: '2年A組', planDate: dateAddDays(2),
          state: '準備完了', generated: defaultGenerated('生成AIを使ったデータ分析と社会課題発見','情報II'),
          approved: { plan: true, material: true, rubric: true }, log: null },
        { id: 'L002', theme: '地域課題を発掘する探究学習', subject: '総合的な探究',
          grade: '高校2年', cls: '2年A組', planDate: dateAddDays(-3),
          state: '実施済', generated: defaultGenerated('地域課題を発掘する探究学習','総合的な探究'),
          approved: { plan: true, material: true, rubric: true },
          log: { date: dateAddDays(-3), attendance: 30, duration: 100, participation: 82, achievement: 68,
                 note: '導入の動画が効果的だった。グループワークでもう少し時間配分を意識したい。' } },
        { id: 'L003', theme: '英語で伝えるプレゼン入門', subject: '英語表現',
          grade: '高校2年', cls: '2年B組', planDate: dateAddDays(5),
          state: 'レビュー中', generated: defaultGenerated('英語で伝えるプレゼン入門','英語表現'),
          approved: { plan: true, material: false, rubric: false }, log: null },
      ];
      persistLessons();
    }
    document.getElementById('kpiPrepared').innerHTML = State.lessons.length + '<span class="unit">件</span>';
    const implCount = State.lessons.filter(l => l.log).length;
    document.getElementById('kpiImplemented').innerHTML = implCount + '<span class="unit">件</span>';

    const rows = State.lessons.slice(0, 5).map(l => {
      const tag = stateTag(l.state);
      return `<tr><td><strong>${escapeHtml(l.theme)}</strong></td>
                  <td>${escapeHtml(l.cls)}</td>
                  <td>${tag}</td>
                  <td>${escapeHtml(l.planDate || '-')}</td></tr>`;
    }).join('');
    tbody.innerHTML = rows || `<tr><td colspan="4" class="empty-state">まだ登録されている授業はありません。</td></tr>`;
  }
  function stateTag(s) {
    const map = {
      '準備完了': 'tag-info', '実施済': 'tag-success',
      'レビュー中': 'tag-warn', '下書き': 'tag-purple',
    };
    return `<span class="tag ${map[s]||'tag-info'}">${s}</span>`;
  }
  function defaultGenerated(theme, subject) {
    return {
      plan: makeGeneratedPlan({ theme, subject, grade:'高校2年', duration:'2コマ', students:32, goal:'', rubric:'' }),
      material: makeGeneratedMaterial({ theme }),
      rubric: makeGeneratedRubric({ rubric: '' }),
    };
  }

  // ============================================================
  // Wizard
  // ============================================================
  function initWizard() {
    document.querySelectorAll('.preset-pill').forEach(btn => {
      btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });
    document.querySelectorAll('.review-tab').forEach(t => {
      t.addEventListener('click', () => switchReviewTab(t.dataset.tab));
    });
    document.querySelectorAll('.wizard-step-pill').forEach(p => {
      p.addEventListener('click', () => {
        const target = parseInt(p.dataset.step, 10);
        if (target < State.wizardStep) setWizardStep(target);
      });
    });
    // sliders
    const p = document.getElementById('logParticipation');
    const pv = document.getElementById('logParticipationValue');
    if (p && pv) p.addEventListener('input', () => pv.textContent = p.value);
    const a = document.getElementById('logAchievement');
    const av = document.getElementById('logAchievementValue');
    if (a && av) a.addEventListener('input', () => av.textContent = a.value);
    // checklists
    document.querySelectorAll('.check-item input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', () => {
        chk.closest('.check-item').classList.toggle('completed', chk.checked);
      });
    });
    // date defaults
    const today = new Date().toISOString().slice(0,10);
    const planDate = document.getElementById('planDate');
    if (planDate) planDate.value = today;
    const logDate = document.getElementById('logDate');
    if (logDate) logDate.value = today;
  }

  function applyPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    document.getElementById('inputTheme').value = p.theme;
    document.getElementById('inputGrade').value = p.grade;
    document.getElementById('inputSubject').value = p.subject;
    document.getElementById('inputDuration').value = p.duration;
    document.getElementById('inputStudents').value = p.students;
    document.getElementById('inputGoal').value = p.goal;
    document.getElementById('inputRubric').value = p.rubric;
    showToast(`プリセット「${({info2:'情報II × AI活用',inquiry:'探究 × 地域連携',data:'データ分析 × ビジネス',english:'英語 × プレゼン'})[key]||key}」を適用`, 'info');
  }

  window.wizardNext = function () {
    if (State.wizardStep === 1 && !validateInput()) return;
    if (State.wizardStep === 3 && !allApproved()) {
      showToast('すべての成果物を承認するとスライド化に進めます', 'error');
      return;
    }
    setWizardStep(State.wizardStep + 1);
  };
  window.wizardPrev = function () { setWizardStep(State.wizardStep - 1); };
  window.resetWizard = function () {
    State.wizardStep = 1;
    State.formData = {};
    State.generated = { plan:'', material:'', rubric:'' };
    State.edited = { plan:'', material:'', rubric:'' };
    State.approved = { plan:false, material:false, rubric:false };
    State.slides = [];
    document.getElementById('inputTheme').value = '';
    document.getElementById('inputGoal').value = '';
    document.getElementById('inputRubric').value = '';
    document.getElementById('slidePreview').classList.add('hidden');
    setWizardStep(1);
    showToast('入力をクリアしました', 'info');
  };
  window.completeWizard = function () {
    showToast('完了しました！マイクラスに保存されています。', 'success');
    switchTeacherPage('progress');
  };

  function setWizardStep(step) {
    step = Math.max(1, Math.min(5, step));
    State.wizardStep = step;
    document.querySelectorAll('.wizard-step-pill').forEach(p => {
      const n = parseInt(p.dataset.step, 10);
      p.classList.remove('active','completed');
      if (n < step) p.classList.add('completed');
      else if (n === step) p.classList.add('active');
    });
    document.querySelectorAll('.wizard-pane').forEach(pane => pane.classList.remove('active'));
    const target = document.querySelector(`.wizard-pane[data-pane="${step}"]`);
    if (target) target.classList.add('active');

    if (step === 2) startGeneration();
    if (step === 3) populateReview();
    if (step === 4) renderSlideThumbsIfReady();
  }

  function validateInput() {
    const theme = document.getElementById('inputTheme').value.trim();
    const goal = document.getElementById('inputGoal').value.trim();
    if (!theme) { showToast('授業テーマを入力してください', 'error'); return false; }
    if (!goal) { showToast('学習目標を入力してください', 'error'); return false; }
    State.formData = {
      theme,
      grade: document.getElementById('inputGrade').value,
      subject: document.getElementById('inputSubject').value,
      duration: document.getElementById('inputDuration').value,
      students: document.getElementById('inputStudents').value,
      goal,
      rubric: document.getElementById('inputRubric').value.trim(),
    };
    return true;
  }

  // ----- Step 2 generation
  function startGeneration() {
    const output = document.getElementById('genOutput');
    output.innerHTML = '<span class="cursor"></span>';
    document.querySelectorAll('.gen-step-row').forEach(r => r.classList.remove('active','done'));

    const fd = State.formData;
    const fullText = buildGeneratedDoc(fd);

    const rows = document.querySelectorAll('.gen-step-row');
    const delays = [150, 1200, 2400, 3600];
    rows.forEach((row, idx) => {
      setTimeout(() => {
        rows.forEach((r, i) => { if (i < idx) r.classList.add('done'); });
        row.classList.add('active');
        row.classList.remove('done');
      }, delays[idx]);
    });
    setTimeout(() => rows.forEach(r => { r.classList.remove('active'); r.classList.add('done'); }), 5200);

    let pos = 0;
    function type() {
      if (pos >= fullText.length) {
        output.innerHTML = escapeHtml(fullText);
        State.generated.plan = extractSection(fullText, '【授業案】', '【教材】');
        State.generated.material = extractSection(fullText, '【教材】', '【ルーブリック】');
        State.generated.rubric = extractSection(fullText, '【ルーブリック】', null);
        State.edited = { ...State.generated };
        State.approved = { plan:false, material:false, rubric:false };
        return;
      }
      pos = Math.min(pos + 7, fullText.length);
      output.innerHTML = escapeHtml(fullText.slice(0, pos)) + '<span class="cursor"></span>';
      output.scrollTop = output.scrollHeight;
      setTimeout(type, 6);
    }
    setTimeout(type, 400);
  }

  function buildGeneratedDoc(fd) {
    return `▶ 副担任 mirAI NEXT｜授業設計エンジン
  対象: ${fd.subject} / ${fd.grade} / ${fd.duration} / ${fd.students}名
  テーマ: ${fd.theme}

【授業案】
${makeGeneratedPlan(fd)}

【教材】
${makeGeneratedMaterial(fd)}

【ルーブリック】
${makeGeneratedRubric(fd)}

— 生成完了 —`;
  }

  function makeGeneratedPlan(fd) {
    return `■ 単元目標
  ${fd.goal || '（学習目標）'}

■ 単元構成（全体設計）
  Phase 1（導入・10分）
   - 学習目標の共有と本時のゴール提示
   - ${fd.theme}に関連する背景・短いケースの紹介

  Phase 2（展開・70〜80分）
   - インプット（15分）: 中核概念の講義
   - 個人ワーク（25分）: 公開データに触れ、気づきを言語化
   - グループ協働（25分）: 課題発見と仮説設計、ワークシート整理
   - 中間共有（10分）: グループごとの仮説を全体に共有

  Phase 3（まとめ・15分）
   - 学びの構造化：ロジックツリーで論点整理
   - 振り返りシートに「自分の言葉で」言語化
   - 次回への課題提示

■ 学習活動の工夫
   - ICT活用: タブレットで可視化ツールを使用
   - 個別最適化: 進度に応じてヒントカード（3段階）を提供
   - 協働学習: ジグソー法で多視点を取り入れる`;
  }

  function makeGeneratedMaterial(fd) {
    return `■ ワークシート構成（PDF想定・3枚）
   1) 観察シート: 与えられた情報から「気づき」を3点書き出す
   2) 仮説シート: 気づきを「課題」に再構成し仮説を立てる
   3) 提案シート: 仮説をもとに解決アイデアを構造化する

■ スライド教材（20枚構成・要点）
   1-3: 背景と社会的文脈、学習目標
   4-6: 中核概念の基本構造
   7-12: 演習例とヒント
   13-17: グループワークの進め方とサンプル
   18-20: まとめと振り返り、参考リンク

■ 配布資料
   - チートシート（用語集・操作手順）
   - 参考データセット（公開オープンデータ3種）
   - 安全・倫理ガイドライン`;
  }

  function makeGeneratedRubric(fd) {
    const baseRubric = fd && fd.rubric ? fd.rubric : '（教員入力なし）';
    return `■ 観点別評価ルーブリック
  ${baseRubric}

■ A評価（卓越）
   - 課題発見: 独自視点で、データ根拠とともに提案できる
   - 思考力: 複数の情報を統合し、論理的に推論できる
   - 表現力: 自分の言葉で結論と過程を明確に説明できる
   - 協働性: 仲間の意見を引き出し統合する役割を果たせる

■ B評価（おおむね到達）
   - データ・情報から示唆を読み取れる
   - 主な手順を理解し実行できる
   - 結論を要点とともに説明できる

■ C評価（基本到達）
   - 提示された手順に従って進められる
   - 基本用語と概念を理解している
   - 自分の取り組みを記入できる

■ 振り返り設問（生徒記入）
   1) 今日の学びで最も印象に残った気づきは？
   2) 解決できなかった疑問・もっと知りたいことは？
   3) 次回どのように発展させたいか？`;
  }

  function extractSection(text, start, end) {
    const s = text.indexOf(start);
    if (s === -1) return '';
    const body = s + start.length;
    if (!end) return text.slice(body).trim();
    const e = text.indexOf(end, body);
    return text.slice(body, e === -1 ? undefined : e).trim();
  }

  // ----- Step 3 review
  function populateReview() {
    switchReviewTab(State.currentTab || 'plan');
  }
  function switchReviewTab(tab) {
    State.currentTab = tab;
    document.querySelectorAll('.review-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const ta = document.getElementById('reviewContent');
    ta.value = State.edited[tab] || State.generated[tab] || '';
    ta.oninput = () => { State.edited[tab] = ta.value; };
    updateReviewStatus();
  }
  function updateReviewStatus() {
    const s = document.getElementById('reviewStatus');
    const approved = State.approved[State.currentTab];
    s.className = 'review-status' + (approved ? ' approved' : '');
    s.querySelector('span:last-child').textContent = approved ? '承認済み' : '未承認';
    document.getElementById('approveCount').textContent = Object.values(State.approved).filter(Boolean).length;
  }
  window.approveCurrent = function () {
    State.approved[State.currentTab] = true;
    updateReviewStatus();
    showToast(`「${tabLabel(State.currentTab)}」を承認しました`, 'success');
    const order = ['plan','material','rubric'];
    const idx = order.indexOf(State.currentTab);
    if (idx < order.length - 1) setTimeout(() => switchReviewTab(order[idx+1]), 350);
  };
  window.regenerateCurrent = function () {
    showToast('再生成中…', 'info');
    const cur = State.edited[State.currentTab] || State.generated[State.currentTab];
    State.edited[State.currentTab] = cur + '\n\n■ 補足（再生成）\n  - 具体的事例を追加\n  - 評価観点の言語化を強化';
    document.getElementById('reviewContent').value = State.edited[State.currentTab];
  };
  function tabLabel(t) { return ({plan:'授業案',material:'教材',rubric:'ルーブリック'})[t] || t; }
  function allApproved() { return State.approved.plan && State.approved.material && State.approved.rubric; }

  // ----- Step 4 slide generation
  window.generateSlides = function () {
    const fd = State.formData;
    State.slides = buildSlideDeck(fd, State.edited);
    document.getElementById('slidePreview').classList.remove('hidden');
    document.getElementById('slideCount').textContent = State.slides.length;
    renderSlideThumbs();
    showToast(`スライド ${State.slides.length} 枚を生成しました`, 'success');
  };

  function buildSlideDeck(fd, content) {
    const deck = [];
    // 1. Cover
    deck.push({
      type: 'cover',
      tag: fd.subject || '授業',
      title: fd.theme || '授業タイトル',
      subtitle: `${fd.grade || ''}　${fd.duration || ''}`,
      body: `<p style="font-size:18px; opacity:.85;">作成：副担任 mirAI NEXT</p>`,
    });
    // 2. Goal
    deck.push({
      type: 'content', tag: '本時のゴール',
      title: '本時の目標',
      body: `<p>${escapeHtml(fd.goal || '本時の学習目標を設定しましょう')}</p>`,
    });
    // 3-5. Plan sections
    const planText = content.plan || '';
    const planSections = splitByPhase(planText);
    planSections.forEach((sec, i) => {
      deck.push({
        type: 'content',
        tag: '授業の流れ',
        title: sec.title,
        body: `<ul>${sec.items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}</ul>`,
      });
    });
    // Materials divider
    deck.push({
      type: 'divider', tag: 'Section 2', title: '使用する教材', body: '',
    });
    // Materials slide
    const matLines = (content.material || '').split('\n').filter(l => l.trim());
    deck.push({
      type: 'content', tag: '教材',
      title: '配布物・スライド構成',
      body: `<ul>${matLines.slice(0,8).map(l => `<li>${escapeHtml(l.replace(/^[\s■]+/, ''))}</li>`).join('')}</ul>`,
    });
    // Activity slide
    deck.push({
      type: 'content', tag: '活動設計',
      title: 'グループ活動の進め方',
      body: `<ol>
        <li><strong>個人で考える</strong>：気づきを3つ書き出す（5分）</li>
        <li><strong>ペアで共有</strong>：観点の違いに気づく（5分）</li>
        <li><strong>グループで構造化</strong>：論点を整理し仮説を立てる（10分）</li>
        <li><strong>クラス全体に発表</strong>：他班との比較で気づきを得る（5分）</li>
      </ol>`,
    });
    // Rubric divider
    deck.push({
      type: 'divider', tag: 'Section 3', title: '評価のポイント', body: '',
    });
    // Rubric slide
    deck.push({
      type: 'content', tag: 'ルーブリック',
      title: '評価ルーブリック（A/B/C）',
      body: rubricToTable(content.rubric || ''),
    });
    // Reflection slide
    deck.push({
      type: 'content', tag: '振り返り',
      title: '振り返りシート',
      body: `<ol>
        <li>今日の学びで最も印象に残った気づきは？</li>
        <li>解決できなかった疑問・もっと知りたいことは？</li>
        <li>次回どのように発展させたいか？</li>
      </ol>`,
    });
    // Closing
    deck.push({
      type: 'cover', tag: '本日は',
      title: 'ありがとうございました', subtitle: '次回もお楽しみに！',
      body: '<p style="opacity:.85;">副担任 mirAI NEXT</p>',
    });
    return deck;
  }

  function splitByPhase(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const sections = [];
    let cur = null;
    lines.forEach(line => {
      const m = line.match(/^\s*Phase\s*\d.*$/);
      if (m) {
        if (cur) sections.push(cur);
        cur = { title: line.trim().replace(/^\s*/, ''), items: [] };
      } else if (cur && line.trim().startsWith('-')) {
        cur.items.push(line.trim().replace(/^-\s*/, ''));
      }
    });
    if (cur) sections.push(cur);
    if (sections.length === 0) {
      // Fallback: take first 6 bullet lines
      const items = lines.filter(l => l.trim().startsWith('-') || l.trim().startsWith('・'))
        .slice(0, 6).map(l => l.trim().replace(/^[-・]\s*/, ''));
      sections.push({ title: '授業の流れ', items });
    }
    return sections;
  }

  function rubricToTable(text) {
    const groups = ['A評価', 'B評価', 'C評価'];
    const out = [];
    const blocks = text.split('■').map(s => s.trim()).filter(Boolean);
    groups.forEach(g => {
      const blk = blocks.find(b => b.startsWith(g));
      if (blk) {
        const lines = blk.split('\n').slice(1).filter(l => l.trim().startsWith('-')).slice(0,3);
        out.push({ name: g, items: lines.map(l => l.trim().replace(/^-\s*/, '')) });
      }
    });
    if (out.length === 0) return `<p>${escapeHtml(text.slice(0,400))}</p>`;
    return `<table style="width:100%; border-collapse:collapse; font-size:14px;">
      ${out.map(g => `
        <tr>
          <td style="padding:10px; vertical-align:top; width:90px; font-weight:800; color:var(--primary); border-bottom:1px solid #eee;">${g.name}</td>
          <td style="padding:10px; border-bottom:1px solid #eee;">${g.items.map(it => `• ${escapeHtml(it)}`).join('<br>')}</td>
        </tr>`).join('')}
    </table>`;
  }

  function renderSlideThumbs() {
    const list = document.getElementById('slideThumbList');
    list.innerHTML = State.slides.map((s, i) => `
      <div class="slide-thumb" style="background:#fff; border:1px solid var(--gray-200); border-radius:10px; padding:12px; cursor:pointer; transition:all .2s;" onclick="openSlideViewer(${i})">
        <div style="font-size:10px; font-weight:700; color:var(--gray-500); margin-bottom:6px;">SLIDE ${i+1}</div>
        <div style="font-size:13px; font-weight:800; color:var(--primary); line-height:1.4;">${escapeHtml(s.title)}</div>
        <div style="font-size:11px; color:var(--gray-500); margin-top:4px;">${escapeHtml(s.tag)}</div>
      </div>
    `).join('');
  }
  function renderSlideThumbsIfReady() {
    if (State.slides.length > 0) {
      document.getElementById('slidePreview').classList.remove('hidden');
      document.getElementById('slideCount').textContent = State.slides.length;
      renderSlideThumbs();
    }
  }

  // ----- Slide viewer
  window.openSlideViewer = function (startIdx) {
    if (!State.slides.length) { showToast('まずスライドを生成してください', 'error'); return; }
    State.slideIndex = typeof startIdx === 'number' ? startIdx : 0;
    document.getElementById('slideOverlay').classList.add('active');
    renderSlide();
    document.addEventListener('keydown', slideKeyHandler);
  };
  window.closeSlideViewer = function () {
    document.getElementById('slideOverlay').classList.remove('active');
    document.removeEventListener('keydown', slideKeyHandler);
  };
  function slideKeyHandler(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') slideNext();
    else if (e.key === 'ArrowLeft') slidePrev();
    else if (e.key === 'Escape') closeSlideViewer();
  }
  window.slideNext = function () {
    if (State.slideIndex < State.slides.length - 1) { State.slideIndex++; renderSlide(); }
  };
  window.slidePrev = function () {
    if (State.slideIndex > 0) { State.slideIndex--; renderSlide(); }
  };
  function renderSlide() {
    const s = State.slides[State.slideIndex];
    const canvas = document.getElementById('slideCanvas');
    canvas.className = 'slide-canvas' + (s.type === 'cover' ? ' cover' : s.type === 'divider' ? ' section-divider' : '');
    canvas.innerHTML = `
      <div class="slide-header">
        <span class="slide-section-tag">${escapeHtml(s.tag || '')}</span>
        <span class="slide-page-number">${State.slideIndex+1} / ${State.slides.length}</span>
      </div>
      <div style="flex:1; display:flex; flex-direction:column; justify-content:${s.type==='cover'||s.type==='divider'?'center':'flex-start'};">
        <h2 class="slide-title">${escapeHtml(s.title)}</h2>
        ${s.subtitle ? `<div class="slide-subtitle">${escapeHtml(s.subtitle)}</div>` : ''}
        <div class="slide-body">${s.body || ''}</div>
      </div>
      <div class="slide-footer">
        <span>${escapeHtml(State.formData.theme || '')}</span>
        <span>副担任 mirAI NEXT</span>
      </div>
    `;
    document.getElementById('slidePos').textContent = State.slideIndex + 1;
    document.getElementById('slideTotal').textContent = State.slides.length;
    document.getElementById('slidePrevBtn').disabled = State.slideIndex === 0;
    document.getElementById('slideNextBtn').disabled = State.slideIndex === State.slides.length - 1;
  }

  // ----- PDF export
  window.downloadSlidesPDF = async function () {
    if (!State.slides.length) { showToast('まずスライドを生成してください', 'error'); return; }
    if (typeof window.jspdf === 'undefined') {
      showToast('PDFライブラリが読み込めませんでした', 'error');
      return;
    }
    showToast(`PDF生成中... (${State.slides.length}枚)`, 'info');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation:'landscape', unit:'pt', format:'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < State.slides.length; i++) {
      if (i > 0) pdf.addPage();
      drawSlidePage(pdf, State.slides[i], i, State.slides.length, pageWidth, pageHeight, State.formData.theme || '');
    }
    const filename = `mirai-slides-${(State.formData.theme||'lesson').replace(/[\\/:*?"<>|]/g,'').slice(0,30)}.pdf`;
    pdf.save(filename);
    showToast('PDFをダウンロードしました', 'success');
  };

  function drawSlidePage(pdf, s, idx, total, W, H, theme) {
    const isCover = s.type === 'cover';
    const isDivider = s.type === 'divider';

    // Background
    if (isCover) {
      pdf.setFillColor(11, 46, 92); pdf.rect(0, 0, W, H, 'F');
    } else if (isDivider) {
      pdf.setFillColor(0, 169, 157); pdf.rect(0, 0, W, H, 'F');
    } else {
      pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, W, H, 'F');
      // top accent
      pdf.setFillColor(45, 111, 219); pdf.rect(0, 0, W, 6, 'F');
    }

    const txtColor = (isCover || isDivider) ? [255,255,255] : [11,46,92];

    // Header bar
    pdf.setTextColor(...txtColor);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(safeAscii(s.tag || ''), 36, 36);
    pdf.text(`${idx+1} / ${total}`, W - 36, 36, { align: 'right' });

    // Title
    pdf.setFontSize(isCover ? 36 : isDivider ? 32 : 26);
    pdf.setFont('helvetica', 'bold');
    const titleY = isCover || isDivider ? H/2 - 20 : 90;
    const titleLines = pdf.splitTextToSize(safeAscii(s.title), W - 80);
    pdf.text(titleLines, isCover || isDivider ? W/2 : 36, titleY, { align: isCover || isDivider ? 'center' : 'left' });

    // Subtitle
    if (s.subtitle) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(safeAscii(s.subtitle), isCover || isDivider ? W/2 : 36, titleY + 30, { align: isCover || isDivider ? 'center' : 'left' });
    }

    // Body (text only)
    if (!isCover && !isDivider) {
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      const bodyText = stripHtml(s.body || '');
      const bodyLines = pdf.splitTextToSize(safeAscii(bodyText), W - 80);
      pdf.text(bodyLines.slice(0, 18), 36, 140);
    }

    // Footer
    pdf.setFontSize(9);
    pdf.setTextColor(...(isCover || isDivider ? [255,255,255] : [148, 163, 184]));
    pdf.text(safeAscii(theme || ''), 36, H - 24);
    pdf.text('mirAI NEXT', W - 36, H - 24, { align: 'right' });
  }

  // jsPDF default fonts don't render Japanese — convert to ASCII fallback notice
  function safeAscii(s) {
    if (!s) return '';
    // jsPDF + helvetica only supports Latin-1. We replace non-Latin1 chars with placeholders
    // but keep Japanese visible via Unicode escape — actually we'll embed best-effort ASCII annotation.
    return s.replace(/[\u0080-\uFFFF]/g, (c) => {
      const cc = c.charCodeAt(0);
      // Common Japanese punctuation to ASCII
      const map = { '：':':', '、':',', '。':'.', '「':'[', '」':']', '【':'<', '】':'>', '『':'<', '』':'>', '〜':'~', '　':' ', '・':'*' };
      return map[c] || c; // keep, jsPDF will draw best effort glyph
    });
  }

  function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<br\s*\/?>/gi, '\n')
               .replace(/<\/li>/gi, '\n')
               .replace(/<li[^>]*>/gi, '• ')
               .replace(/<[^>]+>/g, '')
               .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
               .trim();
  }

  window.downloadLessonText = function () {
    const fd = State.formData;
    const text = buildGeneratedDoc(fd);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lesson-${(fd.theme||'lesson').replace(/[\\/:*?"<>|]/g,'').slice(0,30)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('授業案テキストをダウンロードしました', 'success');
  };

  // ----- Step 5 save
  window.saveLesson = function () {
    const fd = State.formData;
    const id = 'L' + Date.now().toString().slice(-6);
    State.lessons.unshift({
      id,
      theme: fd.theme,
      subject: fd.subject,
      grade: fd.grade,
      cls: document.getElementById('planClass').value,
      planDate: document.getElementById('planDate').value,
      state: '準備完了',
      generated: { ...State.edited },
      approved: { ...State.approved },
      slides: State.slides.length,
      note: document.getElementById('planNote').value,
      log: null,
    });
    persistLessons();
    showToast('マイクラスに保存しました', 'success');
  };

  function persistLessons() {
    try {
      // Trim oversized fields before storing
      const lite = State.lessons.map(l => ({...l, generated: undefined}));
      localStorage.setItem('mirai_lessons', JSON.stringify(lite));
    } catch (_) {}
  }

  // ============================================================
  // Implement page
  // ============================================================
  function renderImplementList() {
    const sel = document.getElementById('implementLessonSelect');
    sel.innerHTML = '<option value="">— 授業を選択 —</option>' +
      State.lessons.map(l => `<option value="${l.id}">${escapeHtml(l.theme)} (${escapeHtml(l.cls)})</option>`).join('');
    document.getElementById('implementContent').classList.add('hidden');
  }
  window.loadImplementLesson = function () {
    const id = document.getElementById('implementLessonSelect').value;
    if (!id) { document.getElementById('implementContent').classList.add('hidden'); return; }
    State.activeImplementId = id;
    const lesson = State.lessons.find(l => l.id === id);
    if (lesson) {
      document.getElementById('logClass').value = lesson.cls || '';
      if (lesson.log) {
        document.getElementById('logAttendance').value = lesson.log.attendance;
        document.getElementById('logDuration').value = lesson.log.duration;
        document.getElementById('logParticipation').value = lesson.log.participation;
        document.getElementById('logParticipationValue').textContent = lesson.log.participation;
        document.getElementById('logAchievement').value = lesson.log.achievement;
        document.getElementById('logAchievementValue').textContent = lesson.log.achievement;
        document.getElementById('logNote').value = lesson.log.note || '';
        document.getElementById('logDate').value = lesson.log.date;
      }
    }
    document.getElementById('implementContent').classList.remove('hidden');
  };
  window.saveImplementLog = function () {
    if (!State.activeImplementId) { showToast('授業を選択してください', 'error'); return; }
    const lesson = State.lessons.find(l => l.id === State.activeImplementId);
    if (!lesson) return;
    lesson.log = {
      date: document.getElementById('logDate').value,
      attendance: +document.getElementById('logAttendance').value,
      duration: +document.getElementById('logDuration').value,
      participation: +document.getElementById('logParticipation').value,
      achievement: +document.getElementById('logAchievement').value,
      note: document.getElementById('logNote').value,
    };
    lesson.state = '実施済';
    persistLessons();
    showToast('実施ログを保存しました', 'success');
  };

  // ============================================================
  // Effects dashboard
  // ============================================================
  function renderEffectsSelector() {
    const sel = document.getElementById('effectsLessonSelect');
    const withLogs = State.lessons.filter(l => l.log);
    sel.innerHTML = '<option value="">— 授業を選択 —</option>' +
      withLogs.map(l => `<option value="${l.id}">${escapeHtml(l.theme)} (${escapeHtml(l.cls)})</option>`).join('');
    if (withLogs.length === 0) {
      document.getElementById('effectsEmpty').classList.remove('hidden');
      document.getElementById('effectsContent').classList.add('hidden');
    } else {
      // auto-select first
      sel.value = withLogs[0].id;
      renderEffects();
    }
  }
  window.renderEffects = function () {
    const id = document.getElementById('effectsLessonSelect').value;
    if (!id) {
      document.getElementById('effectsEmpty').classList.remove('hidden');
      document.getElementById('effectsContent').classList.add('hidden');
      return;
    }
    const l = State.lessons.find(x => x.id === id);
    if (!l || !l.log) return;
    document.getElementById('effectsEmpty').classList.add('hidden');
    document.getElementById('effectsContent').classList.remove('hidden');

    const log = l.log;
    const totalStudents = Math.max(log.attendance, 30);
    const attendanceRate = Math.round((log.attendance / totalStudents) * 100);
    document.getElementById('effAttendance').innerHTML = attendanceRate + '<span class="unit">%</span>';
    document.getElementById('effParticipation').innerHTML = log.participation + '<span class="unit">%</span>';
    document.getElementById('effAchievement').innerHTML = log.achievement + '<span class="unit">%</span>';
    document.getElementById('effCount').innerHTML = '1<span class="unit">回目</span>';
    document.getElementById('effNote').textContent = log.note || '（所感の入力なし）';

    // Improvements
    const ul = document.getElementById('improvementList');
    const improvements = [];
    if (log.achievement < 70) improvements.push('A到達が伸び悩んだ層向けに、展開②で個別ヒント（足場かけ）を追加');
    if (log.participation < 80) improvements.push('導入時に「ペアでの一言シェア」を1分追加して参加の障壁を下げる');
    if (log.note) improvements.push(`教員所感を反映：「${truncate(log.note, 36)}」を次回の冒頭で改善ポイントとして共有`);
    improvements.push('副担任mirAIで生徒の振り返りログを再構成、次回授業の冒頭で活用');
    improvements.push('実施結果から成果報告書のドラフトを自動生成（ワンクリック）');
    ul.innerHTML = improvements.map(i => `<li>${escapeHtml(i)}</li>`).join('');

    // Charts
    if (State.charts.trend) State.charts.trend.destroy();
    if (State.charts.breakdown) State.charts.breakdown.destroy();

    const t = document.getElementById('chartTrend');
    const labels = ['Week-5','Week-4','Week-3','Week-2','Week-1','今週'];
    const baseP = Math.max(40, log.participation - 14);
    const baseA = Math.max(30, log.achievement - 18);
    const partData = [baseP, baseP+2, baseP+4, baseP+6, baseP+10, log.participation];
    const achData = [baseA, baseA+4, baseA+6, baseA+10, baseA+14, log.achievement];

    State.charts.trend = new Chart(t, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label:'参加体感率（%）', data: partData, borderColor:'#2D6FDB',
            backgroundColor:'rgba(45,111,219,.15)', tension:.35, fill:true, borderWidth:2.5, pointRadius:4 },
          { label:'A到達割合（%）', data: achData, borderColor:'#00A99D',
            backgroundColor:'rgba(0,169,157,.10)', tension:.35, fill:true, borderWidth:2.5, pointRadius:4 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position:'bottom', labels:{boxWidth:10,font:{size:11}} } },
        scales: { y:{beginAtZero:true,max:100}, x:{} } }
    });

    const b = document.getElementById('chartBreakdown');
    State.charts.breakdown = new Chart(b, {
      type: 'doughnut',
      data: {
        labels: ['講義・説明','個人ワーク','グループワーク','発表・共有','振り返り'],
        datasets: [{ data: [18,28,30,14,10],
          backgroundColor:['#0B2E5C','#1853A6','#2D6FDB','#00A99D','#D4A017'],
          borderWidth: 2, borderColor: '#fff' }],
      },
      options: { responsive:true, maintainAspectRatio:false, cutout:'60%',
        plugins:{ legend:{position:'right', labels:{boxWidth:10,font:{size:10}}} } },
    });
  };

  // ============================================================
  // Progress table
  // ============================================================
  function renderProgressTable() {
    const tbody = document.getElementById('progressTable');
    if (State.lessons.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📋</div><h4>まだ授業が登録されていません</h4><p>「授業準備」から最初の授業を作成してください。</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = State.lessons.map(l => {
      const ap = l.approved || {};
      const apCount = (ap.plan?1:0) + (ap.material?1:0) + (ap.rubric?1:0);
      return `<tr>
        <td><strong>${escapeHtml(l.theme)}</strong><br><span style="font-size:11px; color:var(--gray-500);">${escapeHtml(l.subject)} / ${escapeHtml(l.grade)}</span></td>
        <td>${escapeHtml(l.cls || '-')}</td>
        <td>${escapeHtml(l.planDate || '-')}</td>
        <td>${stateTag(l.state)}</td>
        <td><span class="tag ${apCount===3?'tag-success':'tag-warn'}">${apCount}/3</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="deleteLesson('${l.id}')">削除</button>
        </td>
      </tr>`;
    }).join('');
  }
  window.deleteLesson = function (id) {
    if (!confirm('この授業を削除しますか？')) return;
    State.lessons = State.lessons.filter(l => l.id !== id);
    persistLessons();
    renderProgressTable();
    showToast('授業を削除しました', 'info');
  };

  // ============================================================
  // Chat logs (teacher view of student conversations)
  // ============================================================
  window.renderChatLogs = function () {
    const filter = document.getElementById('chatLogFilter').value;
    const list = document.getElementById('chatLogsList');
    let logs = STUDENT_CHAT_LOGS;
    if (filter !== 'all') logs = logs.filter(l => l.topic === filter);
    if (!logs.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><h4>該当する対話ログはありません</h4></div>`;
      return;
    }
    list.innerHTML = logs.map(l => `
      <div class="chat-log-item">
        <div class="chat-log-header">
          <div class="chat-log-student">
            <span class="user-avatar" style="width:32px;height:32px;font-size:12px;">${escapeHtml(l.student.charAt(0))}</span>
            ${escapeHtml(l.student)}
            <span style="font-size:11px; color:var(--gray-500); font-weight:500; margin-left:6px;">${escapeHtml(l.cls)}</span>
          </div>
          <div class="chat-log-time">${escapeHtml(l.time)}</div>
        </div>
        <div class="chat-log-snippet">
          <strong>生徒：</strong>${escapeHtml(l.snippet)}<br>
          <span style="color:var(--gray-500);">↳ <strong>mirAI：</strong>${escapeHtml(l.aiReply)}</span>
        </div>
        <div class="chat-log-meta">
          <span class="tag ${tagClassFor(l.topic)}">${escapeHtml(l.tag)}</span>
        </div>
      </div>
    `).join('');
  };
  function tagClassFor(topic) {
    return ({ career:'tag-purple', study:'tag-info', worry:'tag-warn' })[topic] || 'tag-info';
  }

  // ============================================================
  // Chat (teacher + student)
  // ============================================================
  function initLanding() {
    document.querySelectorAll('.chat-suggestion').forEach(s => {
      s.addEventListener('click', () => {
        const ctx = s.closest('.teacher-page,.student-page');
        const role = ctx && ctx.closest('#view-student-app') ? 'student' : 'teacher';
        const input = document.getElementById(role + 'ChatInput');
        if (input) {
          input.value = s.dataset.prompt;
          sendChat(role);
        }
      });
    });
    document.querySelectorAll('.chat-input').forEach(inp => {
      inp.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
          const role = inp.id.includes('teacher') ? 'teacher' : 'student';
          sendChat(role);
        }
      });
    });
  }

  window.sendChat = function (role) {
    const input = document.getElementById(role + 'ChatInput');
    const text = input.value.trim();
    if (!text) return;
    appendChat(role, 'user', text);
    input.value = '';
    showTyping(role);
    if (State.apiMode[role] && State.apiKey[role]) {
      callOpenAI(role, text);
    } else {
      setTimeout(() => {
        hideTyping(role);
        appendChat(role, 'bot', localReply(role, text));
        if (role === 'student') updateStudentChatCount();
      }, 700 + Math.random()*500);
    }
  };

  function appendChat(role, type, text) {
    const wrap = document.getElementById(role + 'ChatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg ' + type;
    div.innerHTML = text.replace(/\n/g, '<br>');
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
    State.chatMessages[role].push({ role: type === 'user' ? 'user' : 'assistant', content: text });
  }
  function showTyping(role) {
    const wrap = document.getElementById(role + 'ChatMessages');
    const t = document.createElement('div');
    t.className = 'chat-msg typing';
    t.id = role + 'Typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    wrap.appendChild(t);
    wrap.scrollTop = wrap.scrollHeight;
  }
  function hideTyping(role) {
    const t = document.getElementById(role + 'Typing');
    if (t) t.remove();
  }

  function localReply(role, prompt) {
    if (role === 'teacher') return teacherLocalReply(prompt);
    return studentLocalReply(prompt);
  }
  function teacherLocalReply(p) {
    if (/情報ii|生成ai|ai活用/i.test(p)) {
      return `情報II × AI活用の授業案、骨子をご提案します👇<br><br>
<strong>テーマ：</strong>「生成AIで読み解く社会データ」<br>
<strong>2コマ構成（100分）：</strong><br>
① 導入（10分）：身近な生成AI事例の共有<br>
② 体験（30分）：公開データをAIで分析<br>
③ 課題発見（30分）：データから社会課題を抽出<br>
④ 提案（25分）：解決アイデアの構造化<br>
⑤ 振り返り（5分）<br><br>
左メニューの「授業準備」→ プリセット「情報II × AI活用」で詳細な授業案・教材・ルーブリックを自動生成できます。`;
    }
    if (/ルーブリック|評価/.test(p)) {
      return `ルーブリック設計のポイント3つ👇<br><br>
① <strong>観点を3〜4に絞る</strong>（思考力・表現力・協働性など）<br>
② <strong>A/B/C段階で具体的行動を記述</strong><br>
③ <strong>生徒が自己評価できる言葉で</strong>書く<br><br>
ウィザードのStep3で実際のルーブリックを編集できます。`;
    }
    if (/探究|地域/.test(p)) {
      return `探究 × 地域連携のテーマ例👇<br><br>
・地元商店街の活性化（データ×ヒアリング）<br>
・空き家活用と若者の街づくり<br>
・地元産業の事業承継<br>
・観光客視点での魅力再発見<br><br>
プリセット「探究 × 地域連携」を選ぶとすぐに下書きが生成されます。`;
    }
    if (/志望理由|推薦|面談/.test(p)) {
      return `志望理由書の支援、3要素を意識すると強いです📝<br><br>
① 原体験：高校の探究で取り組んだ課題<br>
② 気づき・問い：そこから生まれた問題意識<br>
③ 大学での学び：問いを深める計画<br><br>
生徒の対話ログから①②を抽出し、③とつなぐ下書きをmirAIが生成できます。`;
    }
    if (/成果|報告|校内|県教委|文科省/.test(p)) {
      return `成果報告の論点整理👇<br><br>
① 実施規模：何コマ・何名・何テーマ<br>
② 定量：参加率・到達度・準備工数<br>
③ 定性：生徒・教員の声<br>
④ 次年度展望<br><br>
効果測定ダッシュボードで自動可視化できます。`;
    }
    if (/こんにちは|はじめまして|hello/i.test(p)) {
      return `こんにちは、先生！授業設計から評価・生徒対応まで何でもお聞きください😊`;
    }
    return `「${escapeHtml(p)}」についてですね。<br><br>
ご相談いただける主なテーマ：<br>
・授業案・教材・ルーブリックの設計<br>
・生徒の振り返り支援、志望理由<br>
・成果報告・校内説明<br><br>
より具体的にどんな場面でお困りでしょうか？`;
  }
  function studentLocalReply(p) {
    if (/数学|物理|化学|生物|英語|国語|社会/.test(p) || /勉強|わからない|苦手/.test(p)) {
      return `わかります、その悩み🌱<br><br>
まず「わからない」を3つに分けてみましょう：<br>
① <strong>用語</strong>がわからない（覚えれば解決）<br>
② <strong>手順</strong>がわからない（例題で練習）<br>
③ <strong>意味</strong>がわからない（先生に質問）<br><br>
1日10分でも、続けることが力になります。具体的に「どの単元のどこ」が引っかかってますか？`;
    }
    if (/進路|大学|学部|将来|職業/.test(p)) {
      return `進路、迷いますよね。考え方のコツを伝えます🎯<br><br>
① <strong>好きなこと</strong>を3つ書き出す<br>
② <strong>得意なこと</strong>を3つ書き出す<br>
③ <strong>社会で役立つこと</strong>を3つ調べる<br><br>
3つの円が重なる場所が、いまのあなたに合う方向性。<br>
左メニューの「<strong>キャリアシミュレーター</strong>」も試してみてね！`;
    }
    if (/探究|テーマ|決まらない|発表/.test(p)) {
      return `探究テーマ、絞るコツがあるよ🔍<br><br>
① <strong>身近な「もやもや」</strong>を3つ書き出す<br>
② その中で<strong>一番気になる1つ</strong>を選ぶ<br>
③ それを<strong>「誰の」「どんな」</strong>問題かに分解<br><br>
具体になればなるほど、リサーチもしやすくなるよ。`;
    }
    if (/志望理由|書き方|書けない/.test(p)) {
      return `志望理由書、書き出しが大事🌸<br><br>
「いつ、何を見て、どう感じたか」を1つだけ、具体的に書いてみよう。<br>
たとえば：「2年生の文化祭で、地域の方と話して、〇〇に気づいた」<br><br>
その<strong>1シーン</strong>が、あなたらしさになります。`;
    }
    if (/部活|両立|つらい|疲れ|時間|忙しい/.test(p)) {
      return `その気持ち、よく分かるよ💭<br><br>
「両立できない」と感じるとき、たいてい原因は3つに分けられる：<br>
① <strong>体力</strong>：睡眠・食事を見直す<br>
② <strong>時間配分</strong>：1日のスケジュールを書き出す<br>
③ <strong>心の余裕</strong>：信頼できる人に話す<br><br>
担任の先生に相談するのも大事な選択肢だよ。一人で抱え込まないでね。`;
    }
    if (/こんにちは|はじめまして|hello/i.test(p)) {
      return `こんにちは！話しかけてくれてありがとう😊<br>いまどんなことが気になっていますか？気軽に教えてね。`;
    }
    return `「${escapeHtml(p)}」のこと、もう少し聞かせてもらえる？<br><br>
たとえば：<br>
・いつから気になっているか<br>
・どんな場面で感じるか<br>
・どうなったらいいと思うか<br><br>
具体的に話してくれると、いっしょに考えやすいよ🌱`;
  }

  // API mode
  window.toggleApiMode = function (role) {
    const toggle = document.getElementById(role + 'ApiToggle');
    State.apiMode[role] = toggle.checked;
    document.getElementById(role + 'ChatMode').textContent = toggle.checked ? 'OPENAI' : 'LOCAL';
    const handle = document.getElementById(role + 'ToggleHandle');
    if (handle) handle.style.transform = toggle.checked ? 'translateX(14px)' : 'translateX(0)';
    showToast(toggle.checked ? 'OpenAI APIモードに切替' : 'ローカルモードに切替', 'info');
  };
  function initApiInputs() {
    ['teacher','student'].forEach(role => {
      const inp = document.getElementById(role + 'ApiKey');
      if (!inp) return;
      inp.value = State.apiKey[role] || '';
      inp.addEventListener('change', () => {
        State.apiKey[role] = inp.value.trim();
        localStorage.setItem('mirai_api_' + role, State.apiKey[role]);
        showToast(role === 'teacher' ? '教員APIキーを保存' : '生徒APIキーを保存', 'success');
      });
    });
  }

  async function callOpenAI(role, userText) {
    const key = State.apiKey[role];
    if (!key) {
      hideTyping(role);
      appendChat(role, 'bot', '⚠ APIキーが入力されていません。設定欄に入力するか、APIモードをOFFにしてください。');
      return;
    }
    const sysT = `あなたは「副担任 mirAI」という、日本の高校教員を支援するAIです。授業設計・評価・生徒対応・成果報告などを丁寧に支援します。日本語で200〜400字、HTMLの<strong>や<br>を活用してください。`;
    const sysS = `あなたは「副担任 mirAI」という、日本の高校生に寄り添うAIです。学習・進路・悩みについて、共感しながら具体的にサポートします。日本語で150〜300字、優しい言葉でHTMLの<strong>や<br>を活用してください。`;
    const messages = [
      { role: 'system', content: role === 'teacher' ? sysT : sysS },
      ...State.chatMessages[role].slice(-8).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    ];
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model:'gpt-4o-mini', messages, temperature:.7, max_tokens:600 }),
      });
      const data = await res.json();
      hideTyping(role);
      if (data.error) {
        appendChat(role, 'bot', `⚠ APIエラー：${escapeHtml(data.error.message || 'unknown')}`);
        return;
      }
      const reply = data.choices?.[0]?.message?.content || '（応答取得失敗）';
      appendChat(role, 'bot', reply.replace(/\n/g, '<br>'));
    } catch (err) {
      hideTyping(role);
      appendChat(role, 'bot', `⚠ 通信エラー：${escapeHtml(err.message)}`);
    }
  }

  function updateStudentChatCount() {
    const el = document.getElementById('studentChatCount');
    const count = State.chatMessages.student.filter(m => m.role === 'user').length;
    if (el) el.innerHTML = count + '<span class="unit">回</span>';
  }

  // ============================================================
  // Student app mount
  // ============================================================
  function mountStudentApp() {
    document.getElementById('studentName').textContent = State.user.name;
    document.getElementById('studentRole').textContent = State.user.cls;
    document.getElementById('studentAvatar').textContent = State.user.initial;
    document.getElementById('studentWelcome').textContent = `こんにちは、${State.user.name.split(' ').pop()}さん 🌸`;
    renderStudentHome();
    switchStudentPage('home');
  }

  window.switchStudentPage = function (page) {
    State.studentPage = page;
    document.querySelectorAll('#view-student-app .sidebar-link').forEach(l => l.classList.remove('active'));
    const idx = ['home','curriculum','chat','career'].indexOf(page);
    const links = document.querySelectorAll('#view-student-app .sidebar-link');
    if (links[idx]) links[idx].classList.add('active');

    document.querySelectorAll('.student-page').forEach(p => p.classList.add('hidden'));
    const target = document.querySelector(`.student-page[data-page="${page}"]`);
    if (target) target.classList.remove('hidden');

    if (page === 'curriculum') renderCurriculum();
    if (page === 'career') renderInterestGrid();
  };

  function renderStudentHome() {
    const preview = document.getElementById('studentLessonPreview');
    const items = CURRICULUM.slice(0, 3).map(c => `
      <div style="display:flex; gap:12px; padding:10px 0; border-bottom:1px solid var(--gray-100);">
        <div style="width:48px; height:48px; border-radius:10px; background-size:cover; background-position:center; background-image:url('${c.img}'); flex-shrink:0;"></div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:13px; font-weight:700; color:var(--primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(c.title)}</div>
          <div style="font-size:11px; color:var(--gray-500);">${c.lessons}コマ / ${c.materials}教材 / 進捗 ${c.progress}%</div>
          <div class="curriculum-progress-bar" style="margin-top:4px;"><div class="curriculum-progress-fill" style="width:${c.progress}%;"></div></div>
        </div>
      </div>
    `).join('');
    preview.innerHTML = items;
    updateStudentChatCount();
  }

  // Curriculum render
  function initCurriculum() { /* lazy via switch */ }
  function renderCurriculum() {
    const grid = document.getElementById('curriculumGrid');
    grid.innerHTML = CURRICULUM.map(c => `
      <div class="curriculum-card">
        <div class="curriculum-img" style="background-image:url('${c.img}');">
          <span class="curriculum-tag">${escapeHtml(c.tag)}</span>
        </div>
        <div class="curriculum-body">
          <div class="curriculum-title">${escapeHtml(c.title)}</div>
          <div class="curriculum-desc">${escapeHtml(c.desc)}</div>
          <div>
            <div class="curriculum-progress-bar"><div class="curriculum-progress-fill" style="width:${c.progress}%;"></div></div>
            <div style="font-size:11px; color:var(--gray-500);">進捗 ${c.progress}%</div>
          </div>
          <div class="curriculum-meta">
            <span>📖 ${c.lessons}コマ</span>
            <span>📎 ${c.materials}教材</span>
            <button class="btn btn-teal btn-sm" onclick="showToast('「${escapeHtml(c.title)}」を開きました（デモ）', 'info')">開く</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ============================================================
  // Career simulator
  // ============================================================
  function initInterests() {}
  function renderInterestGrid() {
    const grid = document.getElementById('interestGrid');
    grid.innerHTML = INTERESTS.map(i => `
      <button class="interest-chip ${State.interests.has(i.id)?'selected':''}" data-id="${i.id}" onclick="toggleInterest('${i.id}')">
        <span class="emoji">${i.emoji}</span>
        ${escapeHtml(i.label)}
      </button>
    `).join('');
    updateInterestCounter();
  }
  window.toggleInterest = function (id) {
    if (State.interests.has(id)) State.interests.delete(id);
    else State.interests.add(id);
    renderInterestGrid();
  };
  window.resetCareerInterests = function () {
    State.interests.clear();
    renderInterestGrid();
    document.getElementById('careerResultArea').innerHTML = `
      <div class="career-result-empty">
        <div class="icon">🌱</div>
        <p>クリアしました。<br>もう一度興味を選んでみよう。</p>
      </div>`;
    document.getElementById('careerResultCount').textContent = '—';
  };
  function updateInterestCounter() {
    const c = State.interests.size;
    document.getElementById('interestCounter').textContent = `${c}個選択中`;
  }
  window.runCareerMatch = function () {
    if (State.interests.size === 0) {
      showToast('まず興味のある分野を選んでね', 'error');
      return;
    }
    // Score each career
    const sel = Array.from(State.interests);
    const scored = CAREERS.map(c => {
      let hits = c.match.filter(m => sel.includes(m)).length;
      const matchScore = sel.length ? Math.round((hits / sel.length) * 100) : 0;
      // Boost careers that match more of the chosen interests proportionally
      const boost = Math.min(100, matchScore + (hits >= 2 ? 15 : 0));
      return { ...c, score: boost, hits };
    }).filter(c => c.hits > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    if (!scored.length) {
      document.getElementById('careerResultArea').innerHTML = `
        <div class="career-result-empty">
          <div class="icon">🤔</div>
          <p>近い候補が見つからなかったよ。<br>もう少しほかの分野も試してみよう。</p>
        </div>`;
      document.getElementById('careerResultCount').textContent = '0';
      return;
    }

    const html = scored.map(c => `
      <div class="career-card">
        <div class="career-card-head">
          <div class="career-card-title">${escapeHtml(c.title)}</div>
          <div class="career-card-match">マッチ度 ${c.score}%</div>
        </div>
        <div class="career-card-desc">${escapeHtml(c.desc)}</div>
        <div class="career-skills">
          ${c.skills.map(s => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('')}
        </div>
        <div class="career-path"><strong>学びの地図：</strong>${escapeHtml(c.path)}</div>
      </div>
    `).join('');
    document.getElementById('careerResultArea').innerHTML = `
      <h3 style="font-size:18px; font-weight:800; color:var(--teal); margin-bottom:14px;">✨ あなたに合うかもしれない進路</h3>
      ${html}
      <div style="margin-top:14px; padding:14px; background:var(--teal-soft); border-radius:12px; font-size:13px; color:var(--gray-700); line-height:1.8;">
        💬 気になった進路があれば、「<strong>副担任mirAIと話す</strong>」で深掘りしてみよう。<br>
        この結果は、志望理由書の素材としても使えるよ。
      </div>
    `;
    document.getElementById('careerResultCount').textContent = scored.length;
    showToast(`${scored.length}件の候補が見つかったよ！`, 'success');
  };

  // ============================================================
  // Utilities
  // ============================================================
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }
  function dateAddDays(d) {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().slice(0,10);
  }

  function showToast(text, type) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
    t.innerHTML = `<span style="font-weight:900">${icon}</span><span>${escapeHtml(text)}</span>`;
    c.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'all .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateX(20px)';
      setTimeout(() => t.remove(), 300);
    }, 3000);
  }

})();
