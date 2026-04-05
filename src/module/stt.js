import { echo_response } from "./echo.js";

function isStopPhrase(text = '') {
    const normalized = text.trim().toLowerCase()

    const stopPhrases = [
        'стоп',
        'выключись',
        'остановись',
        'заверши сессию',
        'завершить сессию',
        'stop',
        'shutdown',
        'end session',
    ]

    return stopPhrases.includes(normalized)
}

export async function handleUserText(session, text) {
    session.lastUserText = text
    session.history.push({ role: 'user', content: text })

    if (isStopPhrase(text)) {
        const reply = 'Останавливаю голосовую сессию.'
        session.history.push({ role: 'assistant', content: reply })

        return {
            reply,
            shouldEndSession: true,
        }
    }

    const reply = echo_response(text);

    session.history.push({ role: 'assistant', content: reply })
    return {
        reply,
        shouldEndSession: false,
    }
}