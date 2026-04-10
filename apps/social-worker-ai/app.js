// ===== System Prompt =====
var SYSTEM_PROMPT = [
  '你是一位資深社會工作師，專門協助撰寫「身心障礙需求評估報告」。請根據使用者提供的個案資訊，生成完整、專業且格式統一的評估報告。',
  '',
  '## 輸出格式要求',
  '請嚴格按照以下段落結構輸出（使用純文字，不要使用 Markdown 語法）：',
  '',
  '一、主要問題:',
  '簡述案主基本資料（年齡、障礙類別與等級、致障原因）及訪視緣由。',
  '',
  '二、家庭概況:',
  '以（一）（二）（三）...分項描述，包含家庭成員組成、同住狀況、主要照顧者角色與能力、是否符合高負荷家庭照顧者初篩指標、照顧量能評估。',
  '',
  '三、個案現況:',
  '以（一）（二）（三）...分項描述，包含障礙與疾病、就醫狀況、認知能力、視聽力、構音與表達、上下肢功能、行動能力、日常生活自理（沐浴、如廁、穿衣、進食）、社交狀態與心理調適。',
  '',
  '四、福利資源使用現況:',
  '（一）正式資源：列出目前使用的政府補助、長照服務、機構服務等。',
  '（二）非正式資源：家庭支持系統、親友資源等。',
  '',
  '五、看法評估與服務建議:',
  '（一）分級評估結果（第一級至第四級），說明判定依據。',
  '（二）綜合評估與具體服務建議。',
  '',
  '六、其他服務連結或諮詢/跨網絡單位轉介服務:（如有需要）',
  '',
  '## 寫作風格要求',
  '1. 語氣：正式、客觀、專業',
  '2. 人稱：使用「案主」「案妻」「案夫」「案子」「案女」「案母」「案父」等稱謂',
  '3. 用語：使用「無虞」（正常）、「尚可」（堪用但有限制）、「薄弱」（功能低下）、「故」（因果）、「惟」（轉折）、「現」（目前）',
  '4. 描述方式：先事實再評估',
  '5. 字數：800-1500 字',
  '6. 不要使用 Markdown 格式符號（如 ** # - 等），使用純文字格式',
  '',
  '## 重要提醒',
  '- 根據提供資訊合理推論，不捏造未提供的具體數據',
  '- 資訊不足時以「經評估」「據了解」帶過',
  '- 各段落邏輯連貫、前後一致',
  '- 服務建議基於前述評估，具體可執行',
].join('\n');

// ===== Tab Switching =====
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(function (el) {
    el.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(function (el) {
    el.classList.remove('active');
  });
  document.getElementById('tab-' + tab).classList.add('active');
  var btns = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].getAttribute('onclick') === "switchTab('" + tab + "')") {
      btns[i].classList.add('active');
    }
  }
  if (tab === 'history') renderHistory();
}

// ===== Section Toggle =====
function toggleSection(header) {
  var body = header.nextElementSibling;
  var toggle = header.querySelector('.toggle');
  body.classList.toggle('collapsed');
  toggle.textContent = body.classList.contains('collapsed') ? '展開' : '收合';
}

// ===== API Key =====
var API_KEY = 'AIzaSyBklVOb5EFH-YAkkSJqOWDXzAlf-S7qu4U';

// ===== Collect Form Data =====
function getCheckedValues(name) {
  var checked = document.querySelectorAll('input[name="' + name + '"]:checked');
  return Array.from(checked).map(function (el) {
    return el.value;
  });
}

function collectFormData() {
  return {
    clientName: document.getElementById('clientName').value,
    clientAge: document.getElementById('clientAge').value,
    clientGender: document.getElementById('clientGender').value,
    disabilityType: getCheckedValues('disabilityType'),
    disabilityLevel: document.getElementById('disabilityLevel').value,
    maritalStatus: document.getElementById('maritalStatus').value,
    disease: getCheckedValues('disease'),
    diseaseOther: document.getElementById('diseaseOther').value,
    visitReason: document.getElementById('visitReason').value,
    childrenCount: document.getElementById('childrenCount').value,
    livingWith: document.getElementById('livingWith').value,
    mainCaregiver: document.getElementById('mainCaregiver').value,
    caregiverAge: document.getElementById('caregiverAge').value,
    highLoad: getCheckedValues('highLoad'),
    familyNote: document.getElementById('familyNote').value,
    cognition: document.getElementById('cognition').value,
    vision: document.getElementById('vision').value,
    hearing: document.getElementById('hearing').value,
    expression: document.getElementById('expression').value,
    mobility: document.getElementById('mobility').value,
    adl: document.getElementById('adl').value,
    equipment: getCheckedValues('equipment'),
    clientNote: document.getElementById('clientNote').value,
    formalResource: getCheckedValues('formalResource'),
    livingType: document.getElementById('livingType').value,
    resourceNote: document.getElementById('resourceNote').value,
    evaluationLevel: document.getElementById('evaluationLevel').value,
    suggestion: getCheckedValues('suggestion'),
    evalNote: document.getElementById('evalNote').value,
  };
}

function buildUserPrompt(data) {
  var parts = [];

  parts.push('== 案主基本資料 ==');
  if (data.clientAge) parts.push('年齡：' + data.clientAge + '歲');
  if (data.clientGender) parts.push('性別：' + data.clientGender);
  if (data.disabilityType.length) parts.push('障礙類別：' + data.disabilityType.join('、'));
  if (data.disabilityLevel) parts.push('障礙等級：' + data.disabilityLevel);
  if (data.maritalStatus) parts.push('婚姻狀況：' + data.maritalStatus);
  if (data.disease.length) parts.push('致障原因/疾病：' + data.disease.join('、'));
  if (data.diseaseOther) parts.push('其他疾病：' + data.diseaseOther);
  if (data.visitReason) parts.push('訪視緣由：' + data.visitReason);

  parts.push('\n== 家庭概況 ==');
  if (data.childrenCount) parts.push('子女：' + data.childrenCount);
  if (data.livingWith) parts.push('同住者：' + data.livingWith);
  if (data.mainCaregiver) parts.push('主要照顧者：' + data.mainCaregiver);
  if (data.caregiverAge) parts.push('照顧者年齡：' + data.caregiverAge + '歲');
  if (data.highLoad.length) parts.push('高負荷指標：' + data.highLoad.join('、'));
  if (data.familyNote) parts.push('補充：' + data.familyNote);

  parts.push('\n== 個案現況 ==');
  if (data.cognition) parts.push('認知能力：' + data.cognition);
  if (data.vision) parts.push('視力：' + data.vision);
  if (data.hearing) parts.push('聽力：' + data.hearing);
  if (data.expression) parts.push('表達能力：' + data.expression);
  if (data.mobility) parts.push('行動能力：' + data.mobility);
  if (data.adl) parts.push('日常自理：' + data.adl);
  if (data.equipment.length) parts.push('醫療設備：' + data.equipment.join('、'));
  if (data.clientNote) parts.push('補充：' + data.clientNote);

  parts.push('\n== 福利資源 ==');
  if (data.formalResource.length) parts.push('正式資源：' + data.formalResource.join('、'));
  if (data.livingType) parts.push('居住型態：' + data.livingType);
  if (data.resourceNote) parts.push('補充：' + data.resourceNote);

  parts.push('\n== 評估與建議 ==');
  if (data.evaluationLevel) parts.push('分級評估：' + data.evaluationLevel);
  if (data.suggestion.length) parts.push('建議服務：' + data.suggestion.join('、'));
  if (data.evalNote) parts.push('補充：' + data.evalNote);

  return '請根據以下個案資訊生成完整的身心障礙需求評估報告：\n\n' + parts.join('\n');
}

// ===== Generate Report =====
async function generateReport() {
  var data = collectFormData();
  if (!data.clientAge && !data.visitReason) {
    showToast('請至少填寫案主年齡或訪視緣由');
    return;
  }

  var btn = document.getElementById('generateBtn');
  btn.disabled = true;
  btn.textContent = '生成中...';

  var outputArea = document.getElementById('outputArea');
  var outputBody = document.getElementById('outputBody');
  outputArea.style.display = 'block';
  outputBody.innerHTML =
    '<div class="loading"><div class="spinner"></div><span>AI 正在生成評估報告，請稍候...</span></div>';

  var userPrompt = buildUserPrompt(data);
  var apiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=' +
    API_KEY;

  try {
    var response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    });

    var result = await response.json();

    if (result.error) {
      throw new Error(result.error.message || 'API 錯誤');
    }

    var text =
      result.candidates &&
      result.candidates[0] &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts[0] &&
      result.candidates[0].content.parts[0].text;
    if (!text) throw new Error('未收到有效回應');

    outputBody.textContent = text;
    outputBody.classList.remove('empty');

    outputArea.dataset.generatedText = text;
    outputArea.dataset.formData = JSON.stringify(data);

    showToast('報告生成完成！');
  } catch (err) {
    outputBody.innerHTML =
      '<div style="color:var(--danger);padding:20px;">生成失敗：' +
      escapeHtml(err.message) +
      '</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = '生成評估報告';
  }
}

// ===== Copy Output =====
function copyOutput() {
  var outputArea = document.getElementById('outputArea');
  var text = outputArea.dataset.generatedText;
  if (!text) {
    showToast('尚無可複製的內容');
    return;
  }
  navigator.clipboard.writeText(text).then(function () {
    showToast('已複製到剪貼簿！');
  });
}

// ===== History (localStorage) =====
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('sw_history') || '[]');
  } catch (e) {
    return [];
  }
}

function saveToHistory() {
  var outputArea = document.getElementById('outputArea');
  var text = outputArea.dataset.generatedText;
  if (!text) {
    showToast('尚無可儲存的內容');
    return;
  }

  var formData = JSON.parse(outputArea.dataset.formData || '{}');
  var history = getHistory();

  var label = formData.clientName || '未命名個案';

  history.unshift({
    id: Date.now(),
    label: label || '個案紀錄',
    text: text,
    timestamp: new Date().toLocaleString('zh-TW'),
  });

  if (history.length > 50) history.length = 50;

  localStorage.setItem('sw_history', JSON.stringify(history));
  showToast('已儲存至歷史紀錄');
}

function renderHistory() {
  var history = getHistory();
  var container = document.getElementById('historyList');

  if (history.length === 0) {
    container.innerHTML = '<div class="history-empty">尚無歷史紀錄</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < history.length; i++) {
    var item = history[i];
    html +=
      '<div class="history-card">' +
      '<div class="history-card-header">' +
      '<div class="meta"><strong>' +
      escapeHtml(item.label) +
      '</strong></div>' +
      '<span class="meta">' +
      escapeHtml(item.timestamp) +
      '</span>' +
      '</div>' +
      '<div class="history-card-body">' +
      escapeHtml(item.text) +
      '</div>' +
      '<div class="history-card-actions">' +
      '<button class="btn btn-success btn-sm" onclick="copyHistoryItem(' +
      item.id +
      ')">複製</button>' +
      '<button class="btn btn-outline btn-sm" onclick="deleteHistoryItem(' +
      item.id +
      ')">刪除</button>' +
      '</div>' +
      '</div>';
  }
  container.innerHTML = html;
}

function copyHistoryItem(id) {
  var history = getHistory();
  var item = history.find(function (h) {
    return h.id === id;
  });
  if (item) {
    navigator.clipboard.writeText(item.text).then(function () {
      showToast('已複製到剪貼簿！');
    });
  }
}

function deleteHistoryItem(id) {
  var history = getHistory();
  history = history.filter(function (h) {
    return h.id !== id;
  });
  localStorage.setItem('sw_history', JSON.stringify(history));
  renderHistory();
  showToast('已刪除');
}

function clearHistory() {
  if (!confirm('確定要清除所有歷史紀錄嗎？')) return;
  localStorage.removeItem('sw_history');
  renderHistory();
  showToast('已清除所有歷史紀錄');
}

// ===== Clear Form =====
function clearForm() {
  if (!confirm('確定要清除所有欄位嗎？')) return;
  document
    .querySelectorAll('input[type="text"], input[type="number"], textarea')
    .forEach(function (el) {
      el.value = '';
    });
  document.querySelectorAll('select').forEach(function (el) {
    el.selectedIndex = 0;
  });
  document.querySelectorAll('input[type="checkbox"]').forEach(function (el) {
    el.checked = false;
  });
  document.getElementById('outputArea').style.display = 'none';
  showToast('表單已清除');
}

// ===== Utilities =====
function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function () {
    toast.remove();
  }, 2500);
}

// ===== Init =====
// API Key hardcoded, no init needed.
