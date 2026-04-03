export function echo_response(value) {
    const msg = "Value is: " + value;
    return { reply: msg, actions: [], needsConfirmation: false };
}