// 本地化文本缓存
let i18nTexts = {};

// 初始化本地化文本
async function initI18nTexts() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "getI18nTexts"
    });
    if (response && response.success) {
      i18nTexts = response.texts;
    }
  } catch (error) {
    console.log('获取本地化文本失败:', error);
  }
}

// 获取本地化文本
function getI18nText(key, defaultText = '') {
  return i18nTexts[key] || defaultText;
}

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "saveToNotion") {
    await initI18nTexts(); // 每次显示对话框前获取最新的本地化文本
    await showSaveDialog(request.data);
  } else if (request.action === "showQuickNote") {
    await initI18nTexts(); // 每次显示对话框前获取最新的本地化文本
    await showQuickNoteDialog(request.data);
  } else if (request.action === "showError") {
    showNotification(request.message, 'error');
  }
});

// 显示保存对话框
async function showSaveDialog(data) {
  // 先获取配置以确定对话框类型
  const config = await chrome.storage.sync.get(['mode', 'targetPageId', 'targetDatabaseId', 'databaseId']);
  const mode = config.mode || 'database'; // 默认数据库模式，兼容旧配置
  
  console.log('显示保存对话框，模式:', mode, config);
  
  // 创建对话框
  const dialog = document.createElement('div');
  dialog.id = 'notion-save-dialog';
  
  // 根据模式生成不同的页面选择区域
  let pageSelectionHtml = '';
  if (mode === 'page') {
    // 页面模式：显示目标页面信息，不提供选择
    let targetPageName = getI18nText('targetPageConfigured', '已配置目标页面');
    
    // 异步获取页面标题（稍后会更新显示）
    if (config.targetPageId && config.notionToken) {
      // 这里先显示默认文本，稍后通过initPageInfo更新
      targetPageName = getI18nText('loadingPageInfo', '正在获取页面信息...');
    }
    
    pageSelectionHtml = `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333 !important; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-style: normal !important; text-transform: none !important; letter-spacing: normal !important; text-shadow: none !important; cursor: default !important;">${getI18nText('saveToTargetPage', '保存到目标页面:')}</label>
        <div id="target-page-info" style="
          padding: 8px 12px;
          background: #f0f8ff;
          border: 1px solid #b3d9ff;
          border-radius: 4px;
          font-size: 14px;
          color: #0066cc;
        ">
          📄 ${targetPageName}
        </div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">
          ${getI18nText('contentWillAppend', '内容将直接追加到此页面末尾')}
        </div>
      </div>`;
  } else {
    // 数据库模式：提供页面选择和新建选项
    pageSelectionHtml = `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333 !important; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-style: normal !important; text-transform: none !important; letter-spacing: normal !important; text-shadow: none !important; cursor: default !important;">${getI18nText('selectPage', '选择页面:')}</label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <select id="notion-page-select" style="
            flex: 1;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            background: white;
          ">
            <option value="">${getI18nText('loadingPages', '加载中...')}</option>
          </select>
          <button id="notion-create-page" style="
            padding: 8px 12px;
            background: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            white-space: nowrap;
          ">${getI18nText('createNewPage', '新建页面')}</button>
        </div>
      </div>`;
  }
  
  dialog.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      width: 480px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <h3 style="margin: 0 0 15px 0; color: #333 !important; display: flex; align-items: center; gap: 8px; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-style: normal !important; text-transform: none !important; letter-spacing: normal !important; text-shadow: none !important; cursor: default !important; font-weight: 600 !important; font-size: 18px !important;">
        <img src="${chrome.runtime.getURL('icons/icon48.png')}" style="width: 20px; height: 20px;" alt="Phoebe">
        ${getI18nText('saveDialogTitle', '保存到Notion')}
      </h3>
      
      ${pageSelectionHtml}
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333 !important; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-style: normal !important; text-transform: none !important; letter-spacing: normal !important; text-shadow: none !important; cursor: default !important;">${getI18nText('saveDialogContent', '选中内容:')}</label>
        <div id="selected-content-display" style="
          max-height: 120px;
          overflow-y: auto;
          padding: 8px;
          background: #f5f5f5;
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.4;
          color: #333 !important;
          text-decoration: none !important;
          /* 强制重置所有可能影响文本显示的CSS属性 */
          font-weight: normal !important;
          font-style: normal !important;
          text-transform: none !important;
          letter-spacing: normal !important;
          word-spacing: normal !important;
          text-shadow: none !important;
          background-color: #f5f5f5 !important;
          border: 1px solid #e0e0e0 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          /* 防止链接样式影响 */
          cursor: default !important;
          /* 防止被页面的全局选择器影响 */
          all: revert !important;
          /* 然后重新设置我们需要的样式 */
          max-height: 120px !important;
          overflow-y: auto !important;
          padding: 8px !important;
          background: #f5f5f5 !important;
          border-radius: 4px !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
          color: #333 !important;
          text-decoration: none !important;
          display: block !important;
        "></div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333 !important; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-style: normal !important; text-transform: none !important; letter-spacing: normal !important; text-shadow: none !important; cursor: default !important;">${getI18nText('saveDialogNote', '备注 (可选):')}</label>
        <textarea id="notion-note" placeholder="${getI18nText('saveDialogNotePlaceholder', '添加备注...')}" style="
          width: 100%;
          height: 60px;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          resize: vertical;
          box-sizing: border-box;
        "></textarea>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333 !important; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-style: normal !important; text-transform: none !important; letter-spacing: normal !important; text-shadow: none !important; cursor: default !important;">${getI18nText('saveDialogTags', '标签 (可选):')}</label>
        <div id="notion-tags-container" style="
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          min-height: 40px;
          background: white;
          cursor: text;
        ">
          <div id="selected-tags" style="
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 4px;
          "></div>
          <input id="notion-tag-input" type="text" placeholder="${getI18nText('saveDialogTagsPlaceholder', '输入标签，回车添加，或从下拉列表选择')}" style="
            border: none;
            outline: none;
            width: 100%;
            font-size: 14px;
            background: transparent;
          ">
        </div>
        <div id="tag-suggestions" style="
          max-height: 120px;
          overflow-y: auto;
          border: 1px solid #ddd;
          border-top: none;
          background: white;
          display: none;
        "></div>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="notion-cancel" style="
          padding: 8px 16px;
          background: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">${getI18nText('buttonCancel', '取消')}</button>
        <button id="notion-save" style="
          padding: 8px 16px;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">${getI18nText('buttonSave', '保存')}</button>
      </div>
    </div>
    
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    "></div>
  `;
  
  document.body.appendChild(dialog);
  
  // 强制修复所有可能被页面CSS影响的元素样式
  setTimeout(() => {
    const allLabels = dialog.querySelectorAll('label');
    allLabels.forEach(label => {
      // 强制重置label样式，防止被页面CSS覆盖
      label.style.setProperty('color', '#333', 'important');
      label.style.setProperty('text-decoration', 'none', 'important');
      label.style.setProperty('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 'important');
      label.style.setProperty('font-style', 'normal', 'important');
      label.style.setProperty('text-transform', 'none', 'important');
      label.style.setProperty('letter-spacing', 'normal', 'important');
      label.style.setProperty('text-shadow', 'none', 'important');
      label.style.setProperty('cursor', 'default', 'important');
      label.style.setProperty('font-weight', '500', 'important');
      label.style.setProperty('font-size', '14px', 'important');
    });
    
    // 也修复其他可能的文本元素
    const allTextElements = dialog.querySelectorAll('h3, div, span, p');
    allTextElements.forEach(element => {
      if (element.id !== 'selected-content-display') { // 排除已经处理过的内容显示区域
        element.style.setProperty('color', '#333', 'important');
        element.style.setProperty('text-decoration', 'none', 'important');
        element.style.setProperty('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 'important');
      }
    });
    
    console.log('🛡️ [强制样式修复] 已应用JavaScript样式保护');
  }, 10);
  
  // 安全地设置选中内容（避免HTML注入和样式继承问题）
  const contentDisplay = document.getElementById('selected-content-display');
  if (contentDisplay) {
    contentDisplay.textContent = data.content; // 使用textContent而不是innerHTML
    
    // 调试：检查可能影响文本颜色的CSS规则
    console.log('🎨 [CSS调试] 检查选中内容显示区域的样式:');
    const computedStyle = window.getComputedStyle(contentDisplay);
    console.log('  - 实际颜色:', computedStyle.color);
    console.log('  - 实际背景:', computedStyle.backgroundColor);
    console.log('  - 实际字体:', computedStyle.fontFamily);
    console.log('  - 文本装饰:', computedStyle.textDecoration);
    console.log('  - 字体粗细:', computedStyle.fontWeight);
    
    // 检查页面是否有可能影响插件的全局CSS规则
    const stylesheets = document.styleSheets;
    let problematicRules = [];
    
    try {
      for (let i = 0; i < stylesheets.length; i++) {
        const sheet = stylesheets[i];
        try {
          const rules = sheet.cssRules || sheet.rules;
          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            if (rule.selectorText) {
              // 检查可能影响插件的选择器
              if (rule.selectorText.includes('*') || 
                  rule.selectorText.includes('div') ||
                  rule.selectorText.includes(':visited') ||
                  rule.selectorText.includes('a') ||
                  rule.cssText.includes('color:') && rule.cssText.includes('purple')) {
                problematicRules.push({
                  selector: rule.selectorText,
                  cssText: rule.cssText,
                  href: sheet.href
                });
              }
            }
          }
        } catch (e) {
          console.log('  - 无法访问样式表:', sheet.href, e.message);
        }
      }
      
      if (problematicRules.length > 0) {
        console.log('🚨 [CSS调试] 发现可能影响插件的CSS规则:');
        problematicRules.forEach((rule, index) => {
          console.log(`  ${index + 1}. 选择器: ${rule.selector}`);
          console.log(`     规则: ${rule.cssText}`);
          console.log(`     来源: ${rule.href || '内联样式'}`);
        });
      } else {
        console.log('✅ [CSS调试] 未发现明显的问题CSS规则');
      }
    } catch (e) {
      console.log('❌ [CSS调试] 无法完整检查样式表:', e.message);
    }
  }
  
  // 初始化标签管理（总是需要）
  initTagManagement();
  
  // 只在数据库模式下初始化页面选择
  if (mode === 'database') {
    initPageSelection();
  } else if (mode === 'page') {
    // 页面模式下获取并显示页面信息
    // 重新获取完整配置，确保包含notionToken
    const fullConfig = await chrome.storage.sync.get(['notionToken', 'targetPageId']);
    const configForPageInfo = { ...config, ...fullConfig };
    initPageInfo(configForPageInfo);
  }
  
  // 创建一个闭包函数来保存内容，确保data可以被访问到
  const saveContentWithData = async () => {
    const note = document.getElementById('notion-note').value.trim();
    const tags = getSelectedTags();
    
    // 验证Note是必填的
    if (!note) {
      showFieldValidationError('notion-note', getI18nText('pleaseEnterNote', '请输入笔记内容'));
      throw new Error('validation-failed'); // 抛出特殊错误，表示验证失败
    }
    
    // 检查background script是否可用
    if (!chrome.runtime || !chrome.runtime.id) {
      throw new Error(getI18nText('extensionNotInitializedRetry', '扩展未初始化，请刷新页面重试'));
    }
    
    // 使用已获取的配置
    console.log('保存时的配置:', { mode, config });
    
    let saveData = {
      ...data,
      note: note,
      tags: tags
    };
    
    if (mode === 'page') {
      // 普通文档模式：直接追加到预设页面
      if (!config.targetPageId) {
        throw new Error(getI18nText('configureFirst', '请先在设置中配置目标页面'));
      }
      saveData.pageId = config.targetPageId;
      console.log('使用普通文档模式，页面ID:', config.targetPageId);
    } else if (mode === 'database') {
      // 数据库模式：根据用户选择的页面决定
      const selectedPageId = document.getElementById('notion-page-select').value;
      
      if (!selectedPageId) {
        throw new Error(getI18nText('pleaseSelectPage', '请选择一个页面'));
      }
      
      saveData.pageId = selectedPageId;
      console.log('使用数据库模式，选择的页面ID:', selectedPageId);
    }
    
    const response = await chrome.runtime.sendMessage({
      action: "saveToNotionAPI",
      data: saveData
    });
    
    if (response && response.success) {
      // 保存使用过的标签到历史记录
      if (tags.length > 0) {
        chrome.runtime.sendMessage({
          action: "saveTagsToHistory",
          tags: tags
        }).catch(error => {
          console.log('保存标签历史失败:', error);
        });
      }
      
      showNotification(getI18nText('saveSuccess', '成功保存到Notion!'), 'success');
    } else {
      const errorMsg = response && response.error ? response.error : getI18nText('errorNetwork', '未知错误，请检查网络连接');
      throw new Error(errorMsg);
    }
  };
  
  // 绑定事件
  document.getElementById('notion-cancel').onclick = () => {
    document.body.removeChild(dialog);
  };
  
  // 只在数据库模式下绑定新建页面按钮事件
  const createPageBtn = document.getElementById('notion-create-page');
  if (createPageBtn) {
    createPageBtn.onclick = async () => {
      await showCreatePageDialog();
    };
  }
  
  document.getElementById('notion-save').onclick = async () => {
    // 显示保存加载状态
    await showSaveLoading();
    
    // 禁用所有操作按钮
    disableDialogButtons(true);
    
    try {
      await saveContentWithData();
      hideSaveLoading();
      closeDialog(); // 只有保存成功才关闭对话框
    } catch (error) {
      hideSaveLoading();
      console.error('保存失败:', error);
      
      // 如果是验证失败，不显示错误通知，因为已经显示了验证提示
      if (error.message !== 'validation-failed') {
        showNotification(`❌ 保存失败: ${error.message}`, 'error');
      }
    } finally {
      // 重新启用按钮
      disableDialogButtons(false);
    }
  };
  
  // 点击背景关闭
  dialog.children[1].onclick = () => {
    document.body.removeChild(dialog);
  };
}

// 初始化页面信息显示（页面模式）
async function initPageInfo(config) {
  const pageInfoDiv = document.getElementById('target-page-info');
  
  console.log('initPageInfo调用，config:', config);
  console.log('targetPageId:', config.targetPageId, 'notionToken存在:', !!config.notionToken);
  
  if (!pageInfoDiv || !config.targetPageId || !config.notionToken) {
    console.log('配置不完整，显示默认文本');
    if (pageInfoDiv) {
      pageInfoDiv.innerHTML = `📄 ${getI18nText('targetPageConfigured', '已配置目标页面')}`;
    }
    return;
  }
  
  try {
    console.log('开始获取页面信息，pageId:', config.targetPageId);
    
    // 通过background script获取页面信息
    const response = await chrome.runtime.sendMessage({
      action: 'getPageInfo',
      pageId: config.targetPageId,
      notionToken: config.notionToken
    });
    
    console.log('Background script响应:', response);
    
    if (response && response.success) {
      const pageInfo = response.pageInfo;
      console.log('页面信息:', pageInfo);
      
      pageInfoDiv.innerHTML = `📄 ${pageInfo.title}`;
      console.log('页面信息更新完成:', pageInfo.title);
    } else {
      console.error('获取页面信息失败:', response?.error || '未知错误');
      pageInfoDiv.innerHTML = `📄 ${getI18nText('targetPageConfigured', '已配置目标页面')}`;
    }
  } catch (error) {
    console.error('获取页面信息失败:', error);
    pageInfoDiv.innerHTML = `📄 ${getI18nText('targetPageConfigured', '已配置目标页面')}`;
  }
}

// 初始化页面选择
async function initPageSelection() {
  const pageSelect = document.getElementById('notion-page-select');
  
  try {
    // 检查background script是否可用
    if (chrome.runtime && chrome.runtime.id) {
      // 获取配置
      const config = await chrome.storage.sync.get(['notionToken', 'mode', 'targetPageId', 'targetDatabaseId', 'databaseId']);
      
      if (!config.notionToken) {
        pageSelect.innerHTML = `<option value="">${getI18nText('configureFirst', '请先配置Notion API密钥')}</option>`;
        return;
      }
      
      const mode = config.mode || 'database'; // 默认数据库模式，兼容旧配置
      console.log('当前配置模式:', mode, config);
      
      if (mode === 'page') {
        // 普通文档模式：不显示页面选择，因为内容直接追加到预设页面
        if (config.targetPageId) {
          pageSelect.innerHTML = `<option value="${config.targetPageId}" selected>${getI18nText('targetPageConfigured', '已配置目标页面')}</option>`;
          pageSelect.disabled = true;
        } else {
          pageSelect.innerHTML = `<option value="">${getI18nText('configureFirst', '请先在设置中配置目标页面')}</option>`;
        }
        // 隐藏新建页面按钮，因为普通文档模式不需要
        const createPageBtn = document.getElementById('notion-create-page');
        if (createPageBtn) {
          createPageBtn.style.display = 'none';
        }
        return;
      } else if (mode === 'database') {
        // 数据库模式：显示数据库中的页面列表供选择
        const databaseId = config.targetDatabaseId || config.databaseId; // 兼容旧配置
        if (!databaseId) {
          pageSelect.innerHTML = `<option value="">${getI18nText('configureFirst', '请先在设置中配置目标数据库')}</option>`;
          return;
        }
        
        // 显示新建页面按钮
        const createPageBtn = document.getElementById('notion-create-page');
        if (createPageBtn) {
          createPageBtn.style.display = 'inline-block';
        }
        
        // 获取数据库中的页面列表
        const response = await chrome.runtime.sendMessage({
          action: "getDatabasePages"
        });
        
        if (response && response.success) {
          if (response.pages.length === 0) {
            pageSelect.innerHTML = `<option value="">${getI18nText('noPagesInDatabase', '数据库中暂无页面')}</option>`;
          } else {
            // 添加默认提示选项
            let optionsHtml = `<option value="">${getI18nText('selectPage', '选择页面:')}</option>`;
            optionsHtml += response.pages.map(page => 
              `<option value="${page.id}">${page.title}</option>`
            ).join('');
            pageSelect.innerHTML = optionsHtml;
          }
        } else {
          pageSelect.innerHTML = `<option value="">${getI18nText('loadPagesFailed', '加载页面失败')}</option>`;
        }
      }
    } else {
      pageSelect.innerHTML = `<option value="">${getI18nText('extensionNotInitialized', '扩展未初始化')}</option>`;
    }
    
  } catch (error) {
    console.error('加载页面列表失败:', error);
    pageSelect.innerHTML = `<option value="">${getI18nText('loadPagesFailed', '加载页面失败')}</option>`;
  }
}

// 显示创建页面的自定义弹窗
async function showCreatePageDialog() {
  // 获取正确的图标URL
  const iconUrl = chrome.runtime.getURL('icons/icon48.png');
  
  const dialog = document.createElement('div');
  dialog.id = 'create-page-dialog';
  dialog.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 25px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10001;
      width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <img src="${iconUrl}" style="width: 24px; height: 24px; margin-right: 8px;">
        <h3 style="margin: 0; color: #333; font-size: 16px;">${getI18nText('createPageDialogTitle', '创建新页面')}</h3>
      </div>
      
      <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; line-height: 1.4;">
        ${getI18nText('createPageDialogDesc', '请输入页面的名称，Phoebe会帮你自动创建到Notion中 ✨')}
      </p>
      
      <input type="text" id="page-title-input" placeholder="${getI18nText('createPagePlaceholder', '例如：灵感收集、工作笔记...')}" style="
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
        margin-bottom: 15px;
      ">
      
      <div id="page-name-error" style="
        color: #d32f2f;
        font-size: 13px;
        margin-bottom: 10px;
        display: none;
      "></div>
      
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="cancel-create-page" style="
          padding: 8px 16px;
          background: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">${getI18nText('buttonCancel', '取消')}</button>
        <button id="confirm-create-page" style="
          padding: 8px 16px;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">${getI18nText('buttonCreate', '创建')}</button>
      </div>
    </div>
    
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
    "></div>
  `;
  
  document.body.appendChild(dialog);
  
  // 聚焦输入框
  const input = document.getElementById('page-title-input');
  input.focus();
  
  // 绑定事件
  document.getElementById('cancel-create-page').onclick = () => {
    document.body.removeChild(dialog);
  };
  
  document.getElementById('confirm-create-page').onclick = async () => {
    const pageTitle = input.value.trim();
    if (!pageTitle) {
      showPageNameError(getI18nText('pageNameEmpty', '页面名称不能为空'));
      return;
    }
    
    // 检查是否有同名页面
    if (await checkPageNameExists(pageTitle)) {
      showPageNameError(getI18nText('pageNameExists', '已存在同名页面，请使用其他名称'));
      return;
    }
    
    // 开始创建
    await startPageCreation(pageTitle);
    document.body.removeChild(dialog);
  };
  
  // 回车创建
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('confirm-create-page').click();
    }
  });
  
  // 点击背景关闭
  dialog.children[1].onclick = () => {
    document.body.removeChild(dialog);
  };
}

// 显示页面名称错误
function showPageNameError(message) {
  const errorEl = document.getElementById('page-name-error');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 3000);
}

// 检查页面名称是否已存在
async function checkPageNameExists(pageTitle) {
  try {
    const pageSelect = document.getElementById('notion-page-select');
    const options = pageSelect.querySelectorAll('option');
    
    for (const option of options) {
      if (option.textContent.trim() === pageTitle.trim()) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.log('检查页面名称失败:', error);
    return false;
  }
}

// 开始创建页面（带加载状态）
async function startPageCreation(pageTitle) {
  // 显示加载提示
  await showCreatePageLoading(pageTitle);
  
  // 禁用所有操作按钮
  disableDialogButtons(true);
  
  try {
    await createNewPage(pageTitle);
    hideCreatePageLoading();
  } catch (error) {
    hideCreatePageLoading();
    console.error('创建页面失败:', error);
    showNotification(`❌ ${getI18nText('createPageFailed', '创建页面失败')}: ${error.message}`, 'error');
  } finally {
    // 重新启用按钮
    disableDialogButtons(false);
  }
}

// 显示创建页面加载状态
async function showCreatePageLoading(pageTitle) {
  // 获取正确的图标URL
  const iconUrl = chrome.runtime.getURL('icons/icon48.png');
  
  const loadingDialog = document.createElement('div');
  loadingDialog.id = 'create-page-loading';
  loadingDialog.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 25px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10002;
      width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
    ">
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
        <img src="${iconUrl}" style="width: 24px; height: 24px; margin-right: 8px;">
        <h3 style="margin: 0; color: #333; font-size: 16px;">${getI18nText('phoebeWorking', 'Phoebe正在工作中')}</h3>
      </div>
      
      <div style="
        width: 40px;
        height: 40px;
        border: 3px solid #f0f0f0;
        border-top: 3px solid #0066cc;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px auto;
      "></div>
      
      <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.4;">
        ${getI18nText('creatingPage', '正在努力帮你创建页面"$PAGE$"...<br>请稍等片刻 ✨').replace('$PAGE$', pageTitle)}
      </p>
    </div>
    
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      z-index: 10001;
    "></div>
    
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
  document.body.appendChild(loadingDialog);
}

// 隐藏创建页面加载状态
function hideCreatePageLoading() {
  const loadingDialog = document.getElementById('create-page-loading');
  if (loadingDialog) {
    document.body.removeChild(loadingDialog);
  }
}

// 禁用/启用对话框按钮
function disableDialogButtons(disable) {
  const buttons = [
    'notion-cancel',
    'notion-save', 
    'notion-create-page'
  ];
  
  buttons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = disable;
      btn.style.opacity = disable ? '0.6' : '1';
      btn.style.cursor = disable ? 'not-allowed' : 'pointer';
    }
  });
}

// 显示通知
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// 标签管理功能
let selectedTags = [];
let allTags = [];

async function initTagManagement() {
  // 获取标签历史
  try {
    // 检查background script是否可用
    if (chrome.runtime && chrome.runtime.id) {
      const response = await chrome.runtime.sendMessage({
        action: "getTagHistory"
      });
      // 修复：从response.tags中获取标签数组
      allTags = (response && response.success && response.tags) ? response.tags : [];
      console.log('已加载标签历史:', allTags);
    } else {
      console.log('Background script未初始化，跳过标签历史加载');
      allTags = [];
    }
  } catch (error) {
    console.log('获取标签历史失败:', error);
    allTags = [];
  }
  
  const tagInput = document.getElementById('notion-tag-input');
  const tagContainer = document.getElementById('notion-tags-container');
  const suggestions = document.getElementById('tag-suggestions');
  
  // 输入框事件
  tagInput.addEventListener('input', handleTagInput);
  tagInput.addEventListener('keydown', handleTagKeydown);
  tagInput.addEventListener('focus', showSuggestions);
  tagInput.addEventListener('blur', hideSuggestionsDelayed);
  
  // 容器点击聚焦到输入框
  tagContainer.addEventListener('click', () => tagInput.focus());
}

function handleTagInput(event) {
  const input = event.target.value;
  if (input.length > 0) {
    showFilteredSuggestions(input);
  } else {
    showSuggestions();
  }
}

function handleTagKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const tagText = event.target.value.trim();
    if (tagText && !selectedTags.includes(tagText)) {
      addTag(tagText);
      event.target.value = '';
      hideSuggestions();
    }
  } else if (event.key === 'Backspace' && event.target.value === '' && selectedTags.length > 0) {
    removeTag(selectedTags[selectedTags.length - 1]);
  }
}

function addTag(tagText) {
  selectedTags.push(tagText);
  if (!allTags.includes(tagText)) {
    allTags.push(tagText);
    // 立即保存新标签到历史记录
    if (chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage({
        action: "saveTagsToHistory",
        tags: [tagText]
      }).catch(error => {
        console.log('保存标签失败:', error);
      });
    }
  }
  renderSelectedTags();
}

function removeTag(tagText) {
  selectedTags = selectedTags.filter(tag => tag !== tagText);
  renderSelectedTags();
}

function renderSelectedTags() {
  const container = document.getElementById('selected-tags');
  container.innerHTML = '';
  
  selectedTags.forEach(tag => {
    const tagElement = document.createElement('span');
    tagElement.style.cssText = `
      background: #e3f2fd;
      color: #1976d2;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    `;
    
    const tagText = document.createElement('span');
    tagText.textContent = tag;
    
    const removeBtn = document.createElement('span');
    removeBtn.innerHTML = '×';
    removeBtn.style.cssText = `
      cursor: pointer;
      font-weight: bold;
      opacity: 0.7;
    `;
    removeBtn.onclick = () => removeTag(tag);
    
    tagElement.appendChild(tagText);
    tagElement.appendChild(removeBtn);
    container.appendChild(tagElement);
  });
}

function showSuggestions() {
  const suggestions = document.getElementById('tag-suggestions');
  suggestions.innerHTML = '';
  
  const availableTags = allTags.filter(tag => !selectedTags.includes(tag));
  
  if (availableTags.length === 0) {
    suggestions.style.display = 'none';
    return;
  }
  
  availableTags.forEach(tag => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    `;
    item.textContent = tag;
    
    item.onmouseenter = () => item.style.background = '#f5f5f5';
    item.onmouseleave = () => item.style.background = 'white';
    item.onclick = () => {
      addTag(tag);
      document.getElementById('notion-tag-input').value = '';
      hideSuggestions();
    };
    
    suggestions.appendChild(item);
  });
  
  suggestions.style.display = 'block';
}

function showFilteredSuggestions(filter) {
  const suggestions = document.getElementById('tag-suggestions');
  suggestions.innerHTML = '';
  
  const filteredTags = allTags.filter(tag => 
    !selectedTags.includes(tag) && 
    tag.toLowerCase().includes(filter.toLowerCase())
  );
  
  if (filteredTags.length === 0) {
    suggestions.style.display = 'none';
    return;
  }
  
  filteredTags.forEach(tag => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    `;
    item.textContent = tag;
    
    item.onmouseenter = () => item.style.background = '#f5f5f5';
    item.onmouseleave = () => item.style.background = 'white';
    item.onclick = () => {
      addTag(tag);
      document.getElementById('notion-tag-input').value = '';
      hideSuggestions();
    };
    
    suggestions.appendChild(item);
  });
  
  suggestions.style.display = 'block';
}

function hideSuggestions() {
  const suggestions = document.getElementById('tag-suggestions');
  suggestions.style.display = 'none';
}

function hideSuggestionsDelayed() {
  setTimeout(hideSuggestions, 150);
}

function getSelectedTags() {
  return selectedTags;
}

// 创建新页面
async function createNewPage(pageTitle) {
  try {
    // 检查background script是否可用
    if (!chrome.runtime || !chrome.runtime.id) {
      throw new Error(getI18nText('extensionNotInitializedRetry', '扩展未初始化，请刷新页面重试'));
    }
    
    const response = await chrome.runtime.sendMessage({
      action: "createPageInDatabase",
      pageTitle: pageTitle
    });
    
    if (response && response.success) {
      const pageSelect = document.getElementById('notion-page-select');
      
      const option = document.createElement('option');
      option.value = response.page.id;
      option.textContent = response.page.title;
      pageSelect.appendChild(option);
      pageSelect.value = response.page.id;
      
      showNotification(`✅ ${getI18nText('pageCreatedSuccess', '新页面 "$PAGE$" 创建成功').replace('$PAGE$', pageTitle)}`, 'success');
    } else {
      throw new Error(response.error || getI18nText('createPageFailed', '创建页面失败'));
    }
  } catch (error) {
    throw error; // 重新抛出错误给上层处理
  }
}

// 显示保存加载状态
async function showSaveLoading() {
  // 获取正确的图标URL
  const iconUrl = chrome.runtime.getURL('icons/icon48.png');
  
  const loadingDialog = document.createElement('div');
  loadingDialog.id = 'save-loading';
  loadingDialog.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 25px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10002;
      width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
    ">
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
        <img src="${iconUrl}" style="width: 24px; height: 24px; margin-right: 8px;">
        <h3 style="margin: 0; color: #333; font-size: 16px;">${getI18nText('phoebeSaving', 'Phoebe正在保存')}</h3>
      </div>
      
      <div style="
        width: 40px;
        height: 40px;
        border: 3px solid #f0f0f0;
        border-top: 3px solid #0066cc;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px auto;
      "></div>
      
      <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.4;">
        ${getI18nText('savingToNotion', '正在保存到Notion中...<br>请稍等片刻 ✨')}
      </p>
    </div>
    
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      z-index: 10001;
    "></div>
    
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
  document.body.appendChild(loadingDialog);
}

// 隐藏保存加载状态
function hideSaveLoading() {
  const loadingDialog = document.getElementById('save-loading');
  if (loadingDialog) {
    document.body.removeChild(loadingDialog);
  }
}

// 关闭对话框
function closeDialog() {
  console.log('🚪 [对话框] 开始关闭对话框');
  
  // 清理所有可能的验证错误提示
  const errorElements = document.querySelectorAll('[id$="-error"]');
  errorElements.forEach(error => {
    console.log('🧹 [对话框] 清理错误提示:', error.id);
    error.remove();
  });
  
  // 清理可能残留的动画样式
  const animationStyles = document.querySelectorAll('style[textContent*="@keyframes shake"]');
  animationStyles.forEach(style => {
    console.log('🧹 [对话框] 清理动画样式');
    style.remove();
  });
  
  // 检查并关闭普通保存对话框
  const dialog = document.getElementById('notion-save-dialog');
  if (dialog && dialog.parentNode) {
    console.log('🗑️ [对话框] 关闭普通保存对话框');
    document.body.removeChild(dialog);
  }
  
  // 检查并关闭快速笔记对话框
  const quickNoteDialog = document.getElementById('notion-quick-note-dialog');
  if (quickNoteDialog && quickNoteDialog.parentNode) {
    console.log('🗑️ [对话框] 关闭快速笔记对话框');
    document.body.removeChild(quickNoteDialog);
  }
  
  // 清理任何可能的字段样式重置
  const noteField = document.getElementById('notion-note');
  if (noteField) {
    console.log('🧹 [对话框] 重置字段样式');
    noteField.style.removeProperty('border-color');
    noteField.style.removeProperty('box-shadow');
  }
  
  console.log('✅ [对话框] 对话框关闭完成');
}

// 显示快速笔记对话框
async function showQuickNoteDialog(data) {
  // 获取完整配置，包括notionToken
  const config = await chrome.storage.sync.get(['mode', 'targetPageId', 'targetDatabaseId', 'databaseId', 'notionToken']);
  const mode = config.mode || 'database'; // 默认数据库模式，兼容旧配置
  
  console.log('显示快速笔记对话框，模式:', mode, '配置:', config);
  
  // 创建对话框
  const dialog = document.createElement('div');
  dialog.id = 'notion-quick-note-dialog';
  
  // 根据模式生成不同的页面选择区域
  let pageSelectionHtml = '';
  if (mode === 'page') {
    // 页面模式：显示目标页面信息
    pageSelectionHtml = `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333 !important; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-style: normal !important; text-transform: none !important; letter-spacing: normal !important; text-shadow: none !important; cursor: default !important;">${getI18nText('saveToTargetPage', '保存到目标页面:')}</label>
        <div id="target-page-info" style="
          padding: 8px 12px;
          background: #f0f8ff;
          border: 1px solid #b3d9ff;
          border-radius: 4px;
          font-size: 14px;
          color: #0066cc;
        ">
          📄 ${config.targetPageId && config.notionToken ? getI18nText('loadingPageInfo', '正在获取页面信息...') : getI18nText('targetPageConfigured', '已配置目标页面')}
        </div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">
          ${getI18nText('contentWillAppend', '内容将直接追加到此页面末尾')}
        </div>
      </div>`;
  } else {
    // 数据库模式：提供页面选择和新建选项
    pageSelectionHtml = `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333 !important; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-style: normal !important; text-transform: none !important; letter-spacing: normal !important; text-shadow: none !important; cursor: default !important;">${getI18nText('selectPage', '选择页面:')}</label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <select id="notion-page-select" style="
            flex: 1;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            background: white;
          ">
            <option value="">${getI18nText('loadingPages', '加载中...')}</option>
          </select>
          <button id="notion-create-page" style="
            padding: 8px 12px;
            background: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            white-space: nowrap;
          ">${getI18nText('createNewPage', '新建页面')}</button>
        </div>
      </div>`;
  }
  
  dialog.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      width: 450px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <h3 style="margin: 0 0 15px 0; color: #333 !important; display: flex; align-items: center; gap: 8px; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-style: normal !important; text-transform: none !important; letter-spacing: normal !important; text-shadow: none !important; cursor: default !important; font-weight: 600 !important; font-size: 18px !important;">
        <img src="${chrome.runtime.getURL('icons/icon48.png')}" style="width: 20px; height: 20px;" alt="Phoebe">
        ${getI18nText('quickNoteTitle', '快速笔记')}
      </h3>
      
      ${pageSelectionHtml}
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333 !important; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-style: normal !important; text-transform: none !important; letter-spacing: normal !important; text-shadow: none !important; cursor: default !important;">${getI18nText('saveDialogNote', '笔记内容：')}</label>
        <textarea id="notion-note" placeholder="${getI18nText('notePlaceholder', '在此写下您的想法、灵感或笔记...')}" style="
          width: 100%;
          height: 140px;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          resize: vertical;
          box-sizing: border-box;
          line-height: 1.5;
        "></textarea>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333 !important; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-style: normal !important; text-transform: none !important; letter-spacing: normal !important; text-shadow: none !important; cursor: default !important;">${getI18nText('saveDialogTags', '标签 (可选):')}</label>
        <div id="notion-tags-container" style="
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          min-height: 40px;
          background: white;
          cursor: text;
        ">
          <div id="selected-tags" style="
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 4px;
          "></div>
          <input id="notion-tag-input" type="text" placeholder="${getI18nText('saveDialogTagsPlaceholder', '输入标签，回车添加，或从下拉列表选择')}" style="
            border: none;
            outline: none;
            width: 100%;
            font-size: 14px;
            background: transparent;
          ">
        </div>
        <div id="tag-suggestions" style="
          max-height: 120px;
          overflow-y: auto;
          border: 1px solid #ddd;
          border-top: none;
          background: white;
          display: none;
        "></div>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="notion-cancel" style="
          padding: 10px 20px;
          background: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">${getI18nText('buttonCancel', '取消')}</button>
        <button id="notion-save" style="
          padding: 10px 20px;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">${getI18nText('buttonSave', '保存')}</button>
      </div>
    </div>
  `;

  // 添加到页面
  document.body.appendChild(dialog);
  
  // 聚焦到笔记输入框
  const noteTextarea = document.getElementById('notion-note');
  if (noteTextarea) {
    noteTextarea.focus();
  }

  // 绑定事件
  document.getElementById('notion-cancel').addEventListener('click', closeDialog);
  
  const saveButton = document.getElementById('notion-save');
  console.log('🔍 [快速笔记] 找到保存按钮:', saveButton);
  
  // 添加一个简单的点击测试
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      console.log('🖱️ [快速笔记] 保存按钮被点击！');
    });
  } else {
    console.error('❌ [快速笔记] 保存按钮未找到！');
  }
  
  // 根据模式初始化相应的功能
  if (mode === 'page') {
    console.log('🔍 [快速笔记] 初始化页面模式');
    // 页面模式：初始化页面信息（现在config包含notionToken了）
    await initPageInfo(config);
    
    // 保存内容事件（页面模式）
    const saveContentForPage = async () => {
      console.log('📝 [快速笔记-页面模式] 开始保存');
      const note = document.getElementById('notion-note').value.trim();
      const selectedTags = getSelectedTags();
      
      // 验证Note是必填的
      if (!note) {
        console.log('❌ [快速笔记-页面模式] 验证失败：笔记为空');
        showFieldValidationError('notion-note', getI18nText('pleaseEnterNote', '请输入笔记内容'));
        return;
      }
      
      console.log('✅ [快速笔记-页面模式] 验证通过，开始保存流程');
      disableDialogButtons(true);
      await showSaveLoading();
      
      // 保存标签到历史记录
      if (selectedTags.length > 0) {
        await chrome.runtime.sendMessage({
          action: "saveTagsToHistory",
          tags: selectedTags
        });
      }
      
      // 构造简化的保存数据（快速笔记不需要来源信息）
      const saveData = {
        content: note,
        note: '',
        tags: selectedTags,
        url: '', // 快速笔记不需要来源URL
        title: `快速笔记 - ${new Date().toLocaleDateString()}`, // 简化标题
        timestamp: new Date().toISOString(),
        pageId: config.targetPageId
      };
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: "saveToNotionAPI",
          data: saveData
        });
        
        if (response && response.success) {
          showNotification(getI18nText('saveSuccess', '成功保存到Notion!'), 'success');
          setTimeout(closeDialog, 1500);
        } else {
          throw new Error(response?.error || getI18nText('errorNetwork', '未知错误'));
        }
      } catch (error) {
        showNotification(getI18nText('saveFailed', '保存失败') + ': ' + error.message, 'error');
      } finally {
        hideSaveLoading();
        disableDialogButtons(false);
      }
    };
    
    saveButton.addEventListener('click', saveContentForPage);
    console.log('✅ [快速笔记] 已绑定页面模式保存事件');
  } else {
    console.log('🔍 [快速笔记] 初始化数据库模式');
    // 数据库模式：初始化页面选择
    await initPageSelection();
    
    // 保存内容事件（数据库模式）
    const saveContentForDatabase = async () => {
      console.log('📝 [快速笔记-数据库模式] 开始保存');
      const note = document.getElementById('notion-note').value.trim();
      const selectedTags = getSelectedTags();
      const selectedPageId = document.getElementById('notion-page-select').value;
      
      if (!note) {
        console.log('❌ [快速笔记-数据库模式] 验证失败：笔记为空');
        showFieldValidationError('notion-note', getI18nText('pleaseEnterNote', '请输入笔记内容'));
        return;
      }
      
      console.log('✅ [快速笔记-数据库模式] 验证通过，开始保存流程');
      disableDialogButtons(true);
      await showSaveLoading();
      
      // 保存标签到历史记录
      if (selectedTags.length > 0) {
        await chrome.runtime.sendMessage({
          action: "saveTagsToHistory",
          tags: selectedTags
        });
      }
      
      // 构造简化的保存数据
      const saveData = {
        content: note,
        note: '',
        tags: selectedTags,
        url: '', // 快速笔记不需要来源URL
        title: `快速笔记 - ${new Date().toLocaleDateString()}`, // 简化标题
        timestamp: new Date().toISOString(),
        pageId: selectedPageId || null
      };
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: "saveToNotionAPI",
          data: saveData
        });
        
        if (response && response.success) {
          showNotification(getI18nText('saveSuccess', '成功保存到Notion!'), 'success');
          setTimeout(closeDialog, 1500);
        } else {
          throw new Error(response?.error || getI18nText('errorNetwork', '未知错误'));
        }
      } catch (error) {
        showNotification(getI18nText('saveFailed', '保存失败') + ': ' + error.message, 'error');
      } finally {
        hideSaveLoading();
        disableDialogButtons(false);
      }
    };
    
    saveButton.addEventListener('click', saveContentForDatabase);
    console.log('✅ [快速笔记] 已绑定数据库模式保存事件');
    
    // 绑定创建页面按钮
    const createPageButton = document.getElementById('notion-create-page');
    if (createPageButton) {
      createPageButton.addEventListener('click', showCreatePageDialog);
      console.log('✅ [快速笔记] 已绑定创建页面事件');
    }
  }
  
  // 初始化标签管理
  await initTagManagement();
  console.log('✅ [快速笔记] 快速笔记对话框初始化完成');
}

// 显示轻量级的输入框提示
function showFieldValidationError(fieldId, message) {
  console.log(`🔍 [验证] 开始显示字段验证错误: ${fieldId}`, message);
  
  // 移除已存在的提示
  const existingError = document.getElementById(`${fieldId}-error`);
  if (existingError) {
    console.log(`🧹 [验证] 移除已存在的错误提示: ${fieldId}-error`);
    existingError.remove();
  }
  
  const field = document.getElementById(fieldId);
  if (!field) {
    console.error(`❌ [验证] 找不到字段: ${fieldId}`);
    return;
  }
  
  console.log(`✅ [验证] 找到字段:`, field);
  console.log(`📍 [验证] 字段位置:`, field.getBoundingClientRect());
  console.log(`👆 [验证] 父元素:`, field.parentNode);
  
  // 创建错误提示元素
  const errorDiv = document.createElement('div');
  errorDiv.id = `${fieldId}-error`;
  errorDiv.style.cssText = `
    color: #d32f2f !important;
    font-size: 12px !important;
    margin-top: 4px !important;
    display: flex !important;
    align-items: center !important;
    gap: 4px !important;
    background: #fff3f3 !important;
    padding: 6px 8px !important;
    border-radius: 4px !important;
    border: 1px solid #ffcdd2 !important;
    animation: shake 0.3s ease-in-out !important;
    z-index: 10001 !important;
    position: relative !important;
    box-sizing: border-box !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  `;
  errorDiv.innerHTML = `⚠️ ${message}`;
  
  // 添加抖动动画
  const animationId = `shake-${Date.now()}`;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ${animationId} {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }
  `;
  document.head.appendChild(style);
  errorDiv.style.animation = `${animationId} 0.3s ease-in-out`;
  
  // 在输入框后插入错误提示
  try {
    if (field.nextSibling) {
      field.parentNode.insertBefore(errorDiv, field.nextSibling);
    } else {
      field.parentNode.appendChild(errorDiv);
    }
    console.log(`✅ [验证] 错误提示已插入DOM`);
  } catch (insertError) {
    console.error(`❌ [验证] 插入错误提示失败:`, insertError);
    // 备选方案：直接追加到父元素
    try {
      field.parentNode.appendChild(errorDiv);
      console.log(`✅ [验证] 使用备选方案插入错误提示`);
    } catch (backupError) {
      console.error(`❌ [验证] 备选方案也失败:`, backupError);
      return;
    }
  }
  
  // 给输入框添加红色边框
  field.style.setProperty('border-color', '#d32f2f', 'important');
  field.style.setProperty('box-shadow', '0 0 0 1px #d32f2f', 'important');
  
  // 聚焦到出错的输入框
  try {
    field.focus();
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    console.log(`🎯 [验证] 已聚焦到错误字段`);
  } catch (focusError) {
    console.error(`❌ [验证] 聚焦失败:`, focusError);
  }
  
  // 创建清除错误的函数
  const clearError = () => {
    console.log(`🧹 [验证] 清除错误提示: ${fieldId}`);
    if (errorDiv && errorDiv.parentNode) {
      errorDiv.remove();
    }
    field.style.removeProperty('border-color');
    field.style.removeProperty('box-shadow');
    field.removeEventListener('input', clearError);
    field.removeEventListener('focus', clearError);
    // 清理动画样式
    if (style && style.parentNode) {
      style.remove();
    }
  };
  
  // 当用户开始输入或聚焦时，立即移除提示
  field.addEventListener('input', clearError);
  field.addEventListener('focus', clearError);
  
  // 5秒后自动移除提示和红色边框
  setTimeout(() => {
    console.log(`⏰ [验证] 自动清除错误提示: ${fieldId}`);
    clearError();
  }, 5000);
  
  console.log(`✅ [验证] 错误提示设置完成: ${fieldId}`);
}

// 终极CSS隔离方案：使用Shadow DOM（备选方案）
function createIsolatedDialog(data) {
  // 创建宿主元素
  const shadowHost = document.createElement('div');
  shadowHost.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    z-index: 999999 !important;
    pointer-events: none !important;
  `;
  
  // 创建Shadow DOM
  const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
  
  // 在Shadow DOM中创建完全隔离的样式和内容
  shadowRoot.innerHTML = `
    <style>
      :host {
        all: initial;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999999;
        pointer-events: none;
      }
      
      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        pointer-events: all;
        z-index: 1;
      }
      
      .dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        width: 480px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 2;
        pointer-events: all;
      }
      
      .content-display {
        max-height: 120px;
        overflow-y: auto;
        padding: 8px;
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        font-size: 14px;
        line-height: 1.4;
        color: #333;
        font-family: inherit;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      
      h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: #333;
        font-size: 14px;
      }
      
      button {
        padding: 8px 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        background: #f0f0f0;
        color: #333;
      }
      
      button.primary {
        background: #0066cc;
        color: white;
        border: none;
      }
      
      .button-group {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
      }
    </style>
    
    <div class="overlay"></div>
    <div class="dialog">
      <h3>
        <img src="${chrome.runtime.getURL('icons/icon48.png')}" style="width: 20px; height: 20px;" alt="Phoebe">
        保存到Notion
      </h3>
      
      <div style="margin-bottom: 15px;">
        <label>选中内容:</label>
        <div class="content-display">${data.content}</div>
      </div>
      
      <div class="button-group">
        <button class="cancel-btn">取消</button>
        <button class="primary save-btn">保存</button>
      </div>
    </div>
  `;
  
  // 绑定事件
  const cancelBtn = shadowRoot.querySelector('.cancel-btn');
  const saveBtn = shadowRoot.querySelector('.save-btn');
  const overlay = shadowRoot.querySelector('.overlay');
  
  const close = () => document.body.removeChild(shadowHost);
  
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);
  saveBtn.addEventListener('click', () => {
    // 这里添加保存逻辑
    console.log('保存内容:', data.content);
    close();
  });
  
  document.body.appendChild(shadowHost);
}

// 使用说明：在遇到严重CSS冲突时，可以调用此函数替代原有的showSaveDialog
// createIsolatedDialog(data);