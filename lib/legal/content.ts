import { LEGAL_CONTACT } from "./contact";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalDocId = "privacy" | "terms";

const { controller, address, email } = LEGAL_CONTACT;

/**
 * Privacy policy and terms of use, in plain language.
 *
 * Written from how the app actually works today (Clerk sign-in, Supabase
 * database, Vapi voice lessons, anonymous onboarding statistics, Sentry error
 * reports, Vercel hosting). Update it whenever a new service or data type is
 * added. This is a starting draft, not legal advice: have it reviewed (for
 * example by the university's data protection officer) before launch.
 */
export const LEGAL_CONTENT: Record<LegalDocId, Record<"hu" | "en", LegalDocument>> = {
  privacy: {
    hu: {
      title: "Adatvédelmi tájékoztató",
      intro:
        "Ez a tájékoztató egyszerűen elmondja, milyen adatokat használ az eNvolve, mire, és milyen jogaid vannak. Az eNvolve egyetemi kutatási projektként (TDK) induló tanulóalkalmazás, ahol egy AI-tanárral beszélgetve lehet tanulni.",
      sections: [
        {
          heading: "Ki kezeli az adataidat?",
          paragraphs: [
            `Adatkezelő: ${controller}, ${address}.`,
            `Adatvédelmi kérdésekben ezen a címen érsz el minket: ${email}.`,
          ],
        },
        {
          heading: "Milyen adatokat használunk, és mire?",
          list: [
            "Fiókadatok: neved, e-mail-címed és profilképed. Ezekkel tudsz belépni, és ezekből tudjuk, melyik kurzus a tiéd. Ha Google- vagy Facebook-fiókkal lépsz be, ezeket az adatokat onnan kapjuk.",
            "Tanulási adatok: az általad készített kurzusok (név, téma, tantárgy, hang, nyelv), a mentett kurzusaid és az, hogy melyik órát mikor kezdted el. Ezek kellenek ahhoz, hogy a kezdőlapon és a profilodon lásd őket.",
            "Az órák hangja és szövege: óra közben a hangodat a rendszer valós időben szöveggé alakítja, az AI-tanár erre válaszol, a válaszát pedig hangként hallod. A beszélgetés szövege megjelenik az átiratban. A hívás feldolgozását a Vapi és az általa használt beszédfelismerő, nyelvi modell és hangszolgáltató végzi.",
            "A bemutató állapota: hogy láttad-e már az üdvözlő képernyőt és az oldalak tippjeit. Bejelentkezve a fiókodnál tároljuk, kijelentkezve csak a böngésződben.",
            "Névtelen használati statisztika: hogy elindult, befejeződött vagy kimaradt-e egy bemutató, és sikerült-e a mikrofonpróba. Ehhez nem tárolunk nevet, e-mail-címet vagy más azonosítót. Arra használjuk, hogy kiderüljön, hol akadnak el a diákok.",
            "Hibanaplók: ha az alkalmazásban hiba történik, a hiba leírása, a böngésző típusa és az IP-cím a Sentry hibakövető rendszerbe kerül, hogy ki tudjuk javítani.",
          ],
        },
        {
          heading: "Mi alapján kezeljük az adataidat?",
          paragraphs: [
            "A fiók- és tanulási adatokat azért kezeljük, mert ezek nélkül nem tudnánk nyújtani a szolgáltatást (szerződés teljesítése). A névtelen statisztikát és a hibanaplókat jogos érdekünk alapján használjuk, hogy az alkalmazás jól és biztonságosan működjön.",
          ],
        },
        {
          heading: "16 év alatti diákok",
          paragraphs: [
            "Ha még nem vagy 16 éves, az eNvolve-ot csak akkor használhatod, ha a szüleid vagy a gondviselőd ehhez hozzájárultak. Iskolai használat esetén erről az iskola gondoskodik.",
          ],
        },
        {
          heading: "Kik férnek hozzá az adatokhoz?",
          paragraphs: [
            "Az adataidat nem adjuk el, és nem használjuk hirdetésre. A működéshez ezeket a szolgáltatókat vesszük igénybe, és ők csak a feladatukhoz szükséges adatokat kapják meg:",
          ],
          list: [
            "Clerk – bejelentkezés és fiókkezelés",
            "Supabase – az adatbázis, amelyben a kurzusok és a tanulási adatok vannak",
            "Vapi, valamint az általa használt beszédfelismerő (Soniox), nyelvi modell (OpenAI) és hangszolgáltató (ElevenLabs) – a hangos órák",
            "Sentry – hibakövetés",
            "Vercel – a weboldal üzemeltetése",
          ],
        },
        {
          heading: "Adattovábbítás az EU-n kívülre",
          paragraphs: [
            "A fenti szolgáltatók egy része az Egyesült Államokban működik. Az adattovábbítás az uniós szabályok szerint, a szolgáltatók adatfeldolgozási feltételei és az általános szerződési feltételek (SCC) alapján történik.",
          ],
        },
        {
          heading: "Meddig őrizzük az adatokat?",
          paragraphs: [
            "A fiók- és tanulási adataidat addig őrizzük, amíg a fiókod létezik. Ha törlöd a fiókodat, vagy kéred a törlését, az adataidat töröljük. A hívások naplóit a hangszolgáltató a saját beállításai szerint őrzi, a hibanaplók legfeljebb 90 napig maradnak meg. A névtelen statisztika nem köthető hozzád.",
          ],
        },
        {
          heading: "Sütik és a böngésző tárhelye",
          paragraphs: [
            "Csak a működéshez szükséges sütiket használjuk: a bejelentkezéshez (Clerk) és a választott nyelv megjegyzéséhez. Kijelentkezve a böngésző tárhelyén jegyezzük meg, hogy láttad-e már a tippeket. Hirdetési vagy követő sütit nem használunk.",
          ],
        },
        {
          heading: "A mikrofon",
          paragraphs: [
            "A mikrofont csak akkor használjuk, amikor te elindítasz egy órát, a bemutatót vagy a mikrofonpróbát. A mikrofonpróba hangja nem hagyja el a gépedet, és sehol nem tároljuk.",
          ],
        },
        {
          heading: "A jogaid",
          list: [
            "Megkérdezheted, milyen adatokat tárolunk rólad, és kérhetsz róluk másolatot.",
            "Kérheted a helytelen adatok javítását.",
            "Kérheted az adataid törlését, vagy a kezelésük korlátozását.",
            "Tiltakozhatsz a jogos érdeken alapuló adatkezelés ellen.",
            `Ezekhez elég egy e-mail ide: ${email}. Egy hónapon belül válaszolunk.`,
            "Ha úgy érzed, megsértettük a jogaidat, panaszt tehetsz a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH, naih.hu).",
          ],
        },
        {
          heading: "Változások",
          paragraphs: [
            "Ha ez a tájékoztató lényegesen megváltozik, az alkalmazásban jelezzük. Az aktuális változat mindig ezen az oldalon olvasható.",
          ],
        },
      ],
    },
    en: {
      title: "Privacy Policy",
      intro:
        "This policy explains in plain words what data eNvolve uses, why, and what your rights are. eNvolve is a learning app that started as a university research project, where you learn by talking with an AI tutor.",
      sections: [
        {
          heading: "Who is responsible for your data?",
          paragraphs: [
            `Data controller: ${controller}, ${address}.`,
            `For privacy questions, contact us at ${email}.`,
          ],
        },
        {
          heading: "What data we use and why",
          list: [
            "Account data: your name, email address and profile picture. They let you sign in and show which courses are yours. If you sign in with Google or Facebook, we receive this data from there.",
            "Learning data: the courses you build (name, topic, subject, voice, language), the courses you save, and when you started each lesson. They are needed to show them on your home page and profile.",
            "Lesson audio and text: during a lesson your voice is turned into text in real time, the AI tutor answers, and you hear the answer as speech. The text of the conversation appears in the transcript. Calls are processed by Vapi and the speech recognition, language model and voice providers it uses.",
            "Introduction progress: whether you have seen the welcome screen and the page tips. Stored with your account when signed in, and only in your browser when signed out.",
            "Anonymous usage statistics: whether an introduction was started, finished or skipped, and whether the microphone test worked. No name, email address or other identifier is stored. We use this to see where students get stuck.",
            "Error logs: if something goes wrong in the app, a description of the error, the browser type and the IP address are sent to the Sentry error tracker so we can fix it.",
          ],
        },
        {
          heading: "Legal basis",
          paragraphs: [
            "We process account and learning data because the service cannot work without them (performance of a contract). We use anonymous statistics and error logs based on our legitimate interest in keeping the app working well and securely.",
          ],
        },
        {
          heading: "Students under 16",
          paragraphs: [
            "If you are under 16, you may only use eNvolve with the consent of your parents or guardian. When eNvolve is used in a school, the school takes care of this.",
          ],
        },
        {
          heading: "Who can access the data?",
          paragraphs: [
            "We do not sell your data or use it for advertising. We use these services to run the app, and they only receive the data they need for their task:",
          ],
          list: [
            "Clerk – sign-in and account management",
            "Supabase – the database that holds courses and learning data",
            "Vapi, and the speech recognition (Soniox), language model (OpenAI) and voice (ElevenLabs) providers it uses – voice lessons",
            "Sentry – error tracking",
            "Vercel – website hosting",
          ],
        },
        {
          heading: "Transfers outside the EU",
          paragraphs: [
            "Some of these providers operate in the United States. Data is transferred in line with EU rules, under the providers' data processing terms and the Standard Contractual Clauses (SCC).",
          ],
        },
        {
          heading: "How long we keep data",
          paragraphs: [
            "We keep your account and learning data for as long as your account exists. If you delete your account or ask us to, your data is deleted. Call logs are kept by the voice provider according to its settings, and error logs for at most 90 days. Anonymous statistics cannot be linked to you.",
          ],
        },
        {
          heading: "Cookies and browser storage",
          paragraphs: [
            "We only use cookies needed for the app to work: for signing in (Clerk) and for remembering your language. When signed out, your browser storage remembers whether you have seen the tips. We do not use advertising or tracking cookies.",
          ],
        },
        {
          heading: "The microphone",
          paragraphs: [
            "The microphone is only used when you start a lesson, the spoken introduction or the microphone test. The audio of the microphone test never leaves your device and is not stored.",
          ],
        },
        {
          heading: "Your rights",
          list: [
            "You can ask what data we hold about you and get a copy.",
            "You can ask us to correct wrong data.",
            "You can ask us to delete your data or to restrict its use.",
            "You can object to processing based on legitimate interest.",
            `Just send an email to ${email}. We reply within one month.`,
            "If you think we have violated your rights, you can complain to the Hungarian data protection authority (NAIH, naih.hu).",
          ],
        },
        {
          heading: "Changes",
          paragraphs: [
            "If this policy changes significantly, we will tell you in the app. The current version is always on this page.",
          ],
        },
      ],
    },
  },
  terms: {
    hu: {
      title: "Felhasználási feltételek",
      intro:
        "Ezek a feltételek leírják, hogyan használhatod az eNvolve-ot. Ha regisztrálsz, elfogadod őket.",
      sections: [
        {
          heading: "Mi az eNvolve?",
          paragraphs: [
            `Az eNvolve egy tanulóalkalmazás, ahol egy AI-tanárral beszélgetve tanulhatsz. Üzemeltető: ${controller}. Az alkalmazás jelenleg egyetemi kutatási projekt (TDK) részeként, fejlesztés alatt működik, ezért egyes funkciók változhatnak.`,
          ],
        },
        {
          heading: "Ki használhatja?",
          paragraphs: [
            "Bárki, aki elmúlt 16 éves. 16 év alatt csak a szülő vagy a gondviselő hozzájárulásával, illetve iskolai használat esetén az iskola felügyeletével.",
          ],
        },
        {
          heading: "Az AI-tanárról",
          list: [
            "Az AI-tanár egy mesterséges intelligencia, nem ember. Tévedhet, és néha pontatlan választ adhat.",
            "Fontos dolgokban (például vizsga, egészség, jog) mindig ellenőrizd az információt tanárral vagy más megbízható forrásból.",
            "Az eNvolve kiegészíti a tanulást, de nem helyettesíti a tanárt, a fejlesztőpedagógust vagy más szakembert.",
          ],
        },
        {
          heading: "Amit kérünk tőled",
          list: [
            "Ne adj meg magadról vagy másokról érzékeny adatot (például lakcímet, telefonszámot, egészségügyi adatot) a kurzusokban vagy az órákon.",
            "Ne készíts sértő, bántó vagy jogellenes tartalmú kurzust.",
            "Ne próbáld meg megkerülni a rendszer működését, és ne terheld túl szándékosan.",
            "A fiókodat ne add át másnak.",
          ],
        },
        {
          heading: "A kurzusok",
          paragraphs: [
            "Az általad készített kurzusok a tieid, de más felhasználók is láthatják és elindíthatják őket a kurzuskönyvtárban. Ha egy kurzus megsérti ezeket a feltételeket, eltávolíthatjuk.",
          ],
        },
        {
          heading: "Felelősség",
          paragraphs: [
            "Mindent megteszünk, hogy az alkalmazás jól működjön, de fejlesztés alatt álló szolgáltatásként nem tudjuk garantálni, hogy mindig hibátlanul és megszakítás nélkül elérhető. Az AI-tanár válaszaiért a jogszabályok által megengedett mértékben nem vállalunk felelősséget.",
          ],
        },
        {
          heading: "A fiók megszüntetése",
          paragraphs: [
            `A fiókodat bármikor törölheted, vagy kérheted a törlését itt: ${email}. Ha valaki megszegi ezeket a feltételeket, a fiókját felfüggeszthetjük.`,
          ],
        },
        {
          heading: "Változások és jog",
          paragraphs: [
            "Ha a feltételek lényegesen megváltoznak, az alkalmazásban jelezzük. A feltételekre a magyar jog vonatkozik. Az adataid kezeléséről az Adatvédelmi tájékoztatóban olvashatsz.",
          ],
        },
      ],
    },
    en: {
      title: "Terms of Use",
      intro: "These terms describe how you may use eNvolve. By signing up, you accept them.",
      sections: [
        {
          heading: "What is eNvolve?",
          paragraphs: [
            `eNvolve is a learning app where you learn by talking with an AI tutor. Operated by ${controller}. The app currently runs as part of a university research project and is still being developed, so some features may change.`,
          ],
        },
        {
          heading: "Who may use it?",
          paragraphs: [
            "Anyone aged 16 or over. Under 16, only with the consent of a parent or guardian, or under the supervision of a school when used in class.",
          ],
        },
        {
          heading: "About the AI tutor",
          list: [
            "The AI tutor is artificial intelligence, not a person. It can make mistakes and sometimes give inaccurate answers.",
            "For important matters (for example exams, health or law), always check the information with a teacher or another reliable source.",
            "eNvolve supports learning but does not replace a teacher, special education teacher or other professional.",
          ],
        },
        {
          heading: "What we ask of you",
          list: [
            "Do not share sensitive information about yourself or others (such as home address, phone number or health information) in courses or lessons.",
            "Do not build courses with offensive, hurtful or illegal content.",
            "Do not try to get around how the system works, or overload it on purpose.",
            "Do not share your account with anyone else.",
          ],
        },
        {
          heading: "Courses",
          paragraphs: [
            "Courses you build are yours, but other users can see and launch them in the course library. We may remove a course that breaks these terms.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "We do our best to keep the app working well, but as a service under development we cannot guarantee that it is always available and free of errors. To the extent permitted by law, we are not liable for the answers of the AI tutor.",
          ],
        },
        {
          heading: "Closing your account",
          paragraphs: [
            `You can delete your account at any time, or ask us to delete it at ${email}. We may suspend the account of anyone who breaks these terms.`,
          ],
        },
        {
          heading: "Changes and governing law",
          paragraphs: [
            "If these terms change significantly, we will tell you in the app. These terms are governed by Hungarian law. How we handle your data is described in the Privacy Policy.",
          ],
        },
      ],
    },
  },
};
