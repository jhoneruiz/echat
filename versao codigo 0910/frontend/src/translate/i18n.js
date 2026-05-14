import i18n from "i18next";

import { messages } from "./languages";

// Sin LanguageDetector: el idioma siempre es español. El detector arrastraba
// "ar" desde localStorage en algunos dispositivos y rompía moment/dígitos.
i18n.init({
	debug: false,
	defaultNS: ["translations"],
	fallbackLng: "es",
	lng: "es",
	ns: ["translations"],
	resources: messages,
});

export { i18n };
