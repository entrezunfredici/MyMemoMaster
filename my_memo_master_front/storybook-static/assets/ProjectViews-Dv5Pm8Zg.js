import{j as e,f as u,C as t}from"./blocks-CxtVIQc6.js";import{useMDXComponents as c}from"./index-Bd34zhSk.js";import{S as l,H as d,L as p,E as h,F as m,P as x,a as g,b as j}from"./ProjectViews.stories-PdVa9oQn.js";import"./preload-helper-Dp1pzeXC.js";import"./_commonjsHelpers-CqkleIqs.js";import"./iframe-XJxyFdAL.js";import"./logo-full-BaGtaQ1T.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const i=[{title:"Accueil",name:"home",path:"/",source:"src/pages/HomePage.vue",access:"Publique",summary:"Point d'entree avec menu principal et interpreteur mathematique.",dependencies:"Router local, composants Button/Grid, interpreteur",story:"Home",storybookStatus:"Apercu interactif"},{title:"Exercises",name:"exercises",path:"/exercises",source:"src/pages/ExercisesPage.vue",access:"Privee",summary:"Catalogue des tests avec filtre par matiere et acces a la creation.",dependencies:"Auth guard, store tests, store subjects",story:"Exercises",storybookStatus:"Apercu interactif avec stores simules"},{title:"Onboarding",name:"onboarding",path:"/onboarding",source:"src/pages/OnboardingPage.vue",access:"Privee",summary:"Ecran de mise en route actuellement reduit a un placeholder.",dependencies:"Auth guard",story:"Onboarding",storybookStatus:"Apercu interactif"},{title:"Tutorials",name:"tutorials",path:"/tutorials",source:"src/pages/TutorialsPage.vue",access:"Publique",summary:"Liste de tutoriels avec filtre de sujet et bascule des tips.",dependencies:"Store subjects, donnees locales de tutoriels",story:"Tutorials",storybookStatus:"Apercu interactif avec store subjects simule"},{title:"Credits",name:"credits",path:"/credits",source:"src/pages/CreditsPage.vue",access:"Publique",summary:"Tableau de credits et message d'introduction.",dependencies:"Aucune dependance metier",story:"Credits",storybookStatus:"Apercu interactif"},{title:"Flashcards",name:"flashcards",path:"/flashcards",source:"src/pages/FlashcardsPage.vue",access:"Privee",summary:"Vue type Leitner avec saisie question/reponse et recapitulatif.",dependencies:"Auth guard, composants UI locaux",story:"Flashcards",storybookStatus:"Apercu interactif"},{title:"Mindmaps",name:"mindmaps",path:"/mindmaps",source:"src/pages/MindmapsPage.vue",access:"Privee",summary:"Builder de cartes mentales avec liste, autosave, export et edition.",dependencies:"Auth guard, API diagrammes, builder mindmap, toast",story:null,storybookStatus:"Documentation seule",note:"Vue volontairement non previsualisee car elle depend fortement de l'API et du builder."},{title:"Profile",name:"profile",path:"/profile",source:"src/pages/ProfilePage.vue",access:"Privee",summary:"Informations utilisateur et action de deconnexion.",dependencies:"Auth guard, store roles, store auth",story:"Profile",storybookStatus:"Apercu interactif avec role simule"},{title:"Settings",name:"settings",path:"/settings",source:"src/pages/SettingsPage.vue",access:"Privee",summary:"Panneau de parametres utilisateur et application avec toggles d'apparence.",dependencies:"Auth guard, store roles",story:"Settings",storybookStatus:"Apercu interactif avec role simule"},{title:"Create Test",name:"create.test",path:"/create-test",source:"src/pages/CreateTestPage.vue",access:"Privee",summary:"Construction de quiz avec ajout de questions et zone de preview.",dependencies:"Auth guard, stores tests/questions/responses au clic",story:"CreateTest",storybookStatus:"Apercu interactif"},{title:"Classroom",name:"classroom",path:"/classroom",source:"src/pages/ClassroomPage.vue",access:"Privee",summary:"Placeholder de salle de classe.",dependencies:"Auth guard",story:"Classroom",storybookStatus:"Apercu interactif"},{title:"Connexion",name:"auth",path:"/auth",source:"src/pages/login/ConnexionPage.vue",access:"Publique",summary:"Ecran de connexion avec visuel lateral et formulaire.",dependencies:"Store auth au submit",story:"Login",storybookStatus:"Apercu interactif"},{title:"Inscription",name:"register",path:"/register",source:"src/pages/register/InscriptionPage.vue",access:"Publique",summary:"Formulaire d'inscription avec validations cote client.",dependencies:"Store auth au submit",story:"Register",storybookStatus:"Apercu interactif",note:"Le layout applique dans App.vue est celui actuellement utilise par la route."},{title:"Mon compte",name:"account",path:"/account",source:"src/pages/AccountPage.vue",access:"Privee",summary:"Vue WIP actuellement reduite a un placeholder.",dependencies:"Auth guard",story:"Account",storybookStatus:"Apercu interactif"},{title:"Erreur 500",name:"error.server",path:"/error-server",source:"src/pages/error/ErrorServerPage.vue",access:"Publique",summary:"Page de repli en cas de probleme serveur.",dependencies:"Aucune dependance metier",story:"Error500",storybookStatus:"Apercu interactif"},{title:"Erreur 404",name:"error.routing",path:"/:catchAll(.*)*",source:"src/pages/error/ErrorRoutingPage.vue",access:"Publique",summary:"Page de repli pour les routes inconnues.",dependencies:"Catch-all du routeur",story:"Error404",storybookStatus:"Apercu interactif"}],n=[{title:"AuthPage legacy",source:"src/pages/AuthPage.vue",status:"Non routee",summary:"Placeholder non relie au routeur actuel."},{title:"CommunityPage",source:"src/pages/CommunityPage.vue",status:"Non routee",summary:"Placeholder non relie au routeur actuel."}];function o(a){const s={code:"code",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",ul:"ul",...c(),...a.components};return e.jsxs(e.Fragment,{children:[e.jsx(u,{of:l}),`
`,e.jsx(s.h1,{id:"vues-du-projet",children:"Vues du projet"}),`
`,e.jsxs(s.p,{children:["Cette page reference les vues declarees dans ",e.jsx(s.code,{children:"src/router/routes.js"})," et les ecrans presents dans ",e.jsx(s.code,{children:"src/pages"}),`.
Les apercus Storybook refletent le comportement actuel du routeur, des guards et du layout.`]}),`
`,e.jsxs("div",{className:"views-kpis",children:[e.jsxs("div",{className:"views-kpi",children:[e.jsx("strong",{children:i.length}),e.jsx("span",{children:"vues routees"})]}),e.jsxs("div",{className:"views-kpi",children:[e.jsx("strong",{children:i.filter(r=>r.access==="Privee").length}),e.jsx("span",{children:"vues privees"})]}),e.jsxs("div",{className:"views-kpi",children:[e.jsx("strong",{children:i.filter(r=>!!r.story).length}),e.jsx("span",{children:"apercus Storybook"})]}),e.jsxs("div",{className:"views-kpi",children:[e.jsx("strong",{children:n.length}),e.jsx("span",{children:"ecrans hors routage"})]})]}),`
`,e.jsx(s.h2,{id:"lecture-rapide",children:"Lecture rapide"}),`
`,e.jsxs(s.ul,{children:[`
`,e.jsxs(s.li,{children:[e.jsx(s.code,{children:"Apercu interactif"})," signifie qu'une story charge la vue dans son contexte applicatif."]}),`
`,e.jsxs(s.li,{children:[e.jsx(s.code,{children:"Documentation seule"})," signifie que la vue est referencee, mais pas previsualisee pour eviter un rendu trompeur sans backend ou mocks assez solides."]}),`
`,e.jsx(s.li,{children:"Les routes privees sont documentees avec un contexte d'authentification simule dans Storybook."}),`
`]}),`
`,e.jsx(s.h2,{id:"catalogue-des-routes",children:"Catalogue des routes"}),`
`,e.jsxs("table",{className:"views-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Vue"}),e.jsx("th",{children:"Route"}),e.jsx("th",{children:"Acces"}),e.jsx("th",{children:"Source"}),e.jsx("th",{children:"Couverture Storybook"}),e.jsx("th",{children:"Resume"}),e.jsx("th",{children:"Dependances"})]})}),e.jsx("tbody",{children:i.map(r=>e.jsxs("tr",{children:[e.jsxs("td",{children:[e.jsx("strong",{children:r.title}),e.jsx("div",{className:"views-subline",children:e.jsx("code",{children:r.name})}),r.note?e.jsx("div",{className:"views-note",children:r.note}):null]}),e.jsx("td",{children:e.jsx("code",{children:r.path})}),e.jsx("td",{children:r.access}),e.jsx("td",{children:e.jsx("code",{children:r.source})}),e.jsx("td",{children:r.storybookStatus}),e.jsx("td",{children:r.summary}),e.jsx("td",{children:r.dependencies})]},r.name))})]}),`
`,e.jsx(s.h2,{id:"ecrans-presents-mais-non-routes",children:"Ecrans presents mais non routes"}),`
`,e.jsxs("table",{className:"views-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Vue"}),e.jsx("th",{children:"Statut"}),e.jsx("th",{children:"Source"}),e.jsx("th",{children:"Resume"})]})}),e.jsx("tbody",{children:n.map(r=>e.jsxs("tr",{children:[e.jsx("td",{children:r.title}),e.jsx("td",{children:r.status}),e.jsx("td",{children:e.jsx("code",{children:r.source})}),e.jsx("td",{children:r.summary})]},r.title))})]}),`
`,e.jsx(s.h2,{id:"apercus-cles",children:"Apercus cles"}),`
`,e.jsx(s.h3,{id:"accueil",children:"Accueil"}),`
`,e.jsx(t,{of:d}),`
`,e.jsx(s.h3,{id:"connexion",children:"Connexion"}),`
`,e.jsx(t,{of:p}),`
`,e.jsx(s.h3,{id:"exercises",children:"Exercises"}),`
`,e.jsx(t,{of:h}),`
`,e.jsx(s.h3,{id:"flashcards",children:"Flashcards"}),`
`,e.jsx(t,{of:m}),`
`,e.jsx(s.h3,{id:"profile",children:"Profile"}),`
`,e.jsx(t,{of:x}),`
`,e.jsx(s.h3,{id:"settings",children:"Settings"}),`
`,e.jsx(t,{of:g}),`
`,e.jsx(s.h3,{id:"erreur-404",children:"Erreur 404"}),`
`,e.jsx(t,{of:j}),`
`,e.jsx("style",{children:`
  .views-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
    margin: 24px 0 32px;
  }

  .views-kpi {
    border: 1px solid #d5daed;
    border-radius: 12px;
    background: #f8faff;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .views-kpi strong {
    font-size: 28px;
    line-height: 1;
    color: #1e3ba1;
  }

  .views-kpi span {
    font-size: 14px;
    color: #38508f;
  }

  .views-table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 32px;
    font-size: 14px;
  }

  .views-table th,
  .views-table td {
    text-align: left;
    vertical-align: top;
    padding: 12px;
    border: 1px solid #e5e7eb;
  }

  .views-table th {
    background: #f8fafc;
    font-weight: 700;
  }

  .views-subline {
    margin-top: 6px;
    color: #64748b;
  }

  .views-note {
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    background: #eef3ff;
    color: #1e3ba1;
    font-size: 12px;
  }
`})]})}function C(a={}){const{wrapper:s}={...c(),...a.components};return s?e.jsx(s,{...a,children:e.jsx(o,{...a})}):o(a)}export{C as default};
