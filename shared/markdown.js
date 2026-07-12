function renderMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    html = html.replace(/^### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^## (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^# (.*$)/gim, '<h3>$1</h3>');
    
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, function(match, content) {
        return '<li>' + content + '</li>';
    });
    
    html = html.replace(/(<li>.*<\/li>)/gs, function(match) {
        if (!match.startsWith('<ul>')) {
            return '<ul>' + match + '</ul>';
        }
        return match;
    });
    
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, function(match, content) {
        return '<li>' + content + '</li>';
    });
    
    html = html.replace(/(<li>.*<\/li>)/gs, function(match) {
        if (!match.startsWith('<ol>') && !match.startsWith('<ul>')) {
            const items = match.match(/<li>/g);
            if (items && items.length > 1) {
                const firstItem = match.match(/<li>(\d+\.)?/);
                if (firstItem && firstItem[1]) {
                    return '<ol>' + match + '</ol>';
                }
            }
        }
        return match;
    });
    
    html = html.replace(/\n{2,}/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    html = html.replace(/<p><h/g, '<h');
    html = html.replace(/<\/h\d><\/p>/g, function(match) {
        return match.replace('</p>', '');
    });
    html = html.replace(/<p><ul>/g, '<ul>');
    html = html.replace(/<\/ul><\/p>/g, '</ul>');
    html = html.replace(/<p><ol>/g, '<ol>');
    html = html.replace(/<\/ol><\/p>/g, '</ol>');
    html = html.replace(/<p><li>/g, '<li>');
    html = html.replace(/<\/li><\/p>/g, '</li>');
    
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    return html;
}

function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) return '';
    
    let html = '<div class="ai-suggestion-list">';
    suggestions.forEach((suggestion, index) => {
        const iconMatch = suggestion.match(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{200D}]+/u);
        const icon = iconMatch ? iconMatch[0] : '•';
        const text = suggestion.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{200D}]+\s*/u, '');
        
        const isWarning = suggestion.startsWith('⚠️');
        const isSuccess = suggestion.startsWith('✅') || suggestion.startsWith('🎉');
        
        html += `<div class="ai-suggestion-item ${isWarning ? 'warning' : ''} ${isSuccess ? 'success' : ''}">
            <span class="ai-suggestion-icon">${icon}</span>
            <div class="ai-suggestion-text">${renderMarkdown(text)}</div>
        </div>`;
    });
    html += '</div>';
    
    return html;
}
