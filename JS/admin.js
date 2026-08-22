// ברגע שהדף נטען לחלוטין, נריץ את הפעולות
document.addEventListener('DOMContentLoaded', () => {
    
    // פונקציה שמגדירה ברכה אישית לפי שעות היום
    function setGreeting() {
        const greetingElement = document.getElementById('adminGreeting');
        const currentHour = new Date().getHours();
        let greetingText = 'שלום, מנהל מערכת';

        if (currentHour >= 5 && currentHour < 12) {
            greetingText = 'בוקר טוב, מנהל מערכת';
        } else if (currentHour >= 12 && currentHour < 18) {
            greetingText = 'צהריים טובים, מנהל מערכת';
        } else if (currentHour >= 18 && currentHour < 22) {
            greetingText = 'ערב טוב, מנהל מערכת';
        } else {
            greetingText = 'לילה טוב, מנהל מערכת';
        }

        if (greetingElement) {
            greetingElement.textContent = greetingText;
        }
    }

    // הפעלת הפונקציה
    setGreeting();
});