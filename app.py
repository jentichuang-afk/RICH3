import streamlit as st
import streamlit.components.v1 as components
import re

# 設定 Streamlit 頁面為寬螢幕模式與標題
st.set_page_config(
    page_title="三國大富翁",
    page_icon="🎲",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 隱藏 Streamlit 預設選單與 Footer，讓畫面更像獨立遊戲
hide_st_style = """
            <style>
            #MainMenu {visibility: hidden;}
            footer {visibility: hidden;}
            header {visibility: hidden;}
            </style>
            """
st.markdown(hide_st_style, unsafe_allow_html=True)

# 讀取前端資源檔
def load_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

try:
    html_content = load_file('index.html')
    css_content = load_file('style.css')
    items_js = load_file('items.js')
    officers_js = load_file('officers.js')
    utils_js = load_file('utils.js')
    combat_engine_js = load_file('combat_engine.js')
    item_system_js = load_file('item_system.js')
    ai_model_js = load_file('ai_model.js')
    firebase_config_js = load_file('firebase-config.js')
    game_js = load_file('game.js')

    # 將 CSS 和 JS 直接注入到 HTML
    html_with_css = html_content.replace('</head>', f'<style>{css_content}</style></head>')
    # 移除原本所有的外部「本地」 script 引入 (排除 http 開頭的 CDN，例如 Firebase)
    html_with_css = re.sub(r'<script[^>]*src=["\'](?!http).*?\.js["\'][^>]*></script>', '', html_with_css)
    
    # 注意：officers.js 和 items.js 等必須在 game.js 之前載入
    scripts = f'<script>{items_js}</script><script>{officers_js}</script><script>{utils_js}</script><script>{combat_engine_js}</script><script>{item_system_js}</script><script>{ai_model_js}</script><script>{firebase_config_js}</script><script>{game_js}</script>'
    final_html = html_with_css.replace('</body>', f'{scripts}</body>')

    # 將背景顏色鎖定，防止受到 Streamlit 佈景主題影響
    # iframe_style = "background-color: #f4ecdf; width: 100%; height: 100vh; border: none;"
    
    # 渲染至 Streamlit
    components.html(final_html, height=1000, scrolling=True)

except Exception as e:
    st.error(f"遊戲資源載入失敗: {e}\n請確認應用程式目錄中包含 index.html, style.css, officers.js 以及 game.js。")
    
# 側邊欄簡易說明
with st.sidebar:
    st.title("🎲 三國大富翁")
    st.markdown("### 群雄逐鹿，天下誰屬")
    st.markdown("---")
    st.markdown("**支援模式：**\n- 1~4人 單機與 AI 對戰")
    st.markdown("**特色：**\n- 84名三國知名武將\n- 真實武將專屬技能\n- 佔地、攻城、過路費結算\n- 長安專屬在野招募系統")
    st.markdown("---")
    st.caption("由 Gemini Agentic Copilot 協助編寫與部屬")
