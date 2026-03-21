import{M as _}from"./Header-D3DwYuOW.js";import{p as f,o as w,c as B,d as b,f as k}from"./iframe-XJxyFdAL.js";import{_ as L}from"./_plugin-vue_export-helper-DlAUqK2U.js";import"./Button-D-2KV6MU.js";import"./preload-helper-Dp1pzeXC.js";const a={name:"my-page",components:{MyHeader:_},data(){return{user:null}},methods:{onLogin(){this.user={name:"Jane Doe"}},onLogout(){this.user=null},onCreateAccount(){this.user={name:"Jane Doe"}}}};function x(c,e,o,i,y,r){const v=f("my-header");return w(),B("article",null,[b(v,{user:y.user,onLogin:r.onLogin,onLogout:r.onLogout,onCreateAccount:r.onCreateAccount},null,8,["user","onLogin","onLogout","onCreateAccount"]),e[0]||(e[0]=k('<section class="storybook-page"><h2>Pages in Storybook</h2><p> We recommend building UIs with a <a href="https://componentdriven.org" target="_blank" rel="noopener noreferrer"><strong>component-driven</strong></a> process starting with atomic components and ending with pages. </p><p> Render pages with mock data. This makes it easy to build and review page states without needing to navigate to them in your app. Here are some handy patterns for managing page data in Storybook: </p><ul><li> Use a higher-level connected component. Storybook helps you compose such data from the &quot;args&quot; of child component stories </li><li> Assemble data in the page component from your services. You can mock these services out using Storybook. </li></ul><p> Get a guided tutorial on component-driven development at <a href="https://storybook.js.org/tutorials/" target="_blank" rel="noopener noreferrer">Storybook tutorials</a> . Read more in the <a href="https://storybook.js.org/docs" target="_blank" rel="noopener noreferrer">docs</a> . </p><div class="tip-wrapper"><span class="tip">Tip</span> Adjust the width of the canvas with the <svg width="10" height="10" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M1.5 5.2h4.8c.3 0 .5.2.5.4v5.1c-.1.2-.3.3-.4.3H1.4a.5.5 0 01-.5-.4V5.7c0-.3.2-.5.5-.5zm0-2.1h6.9c.3 0 .5.2.5.4v7a.5.5 0 01-1 0V4H1.5a.5.5 0 010-1zm0-2.1h9c.3 0 .5.2.5.4v9.1a.5.5 0 01-1 0V2H1.5a.5.5 0 010-1zm4.3 5.2H2V10h3.8V6.2z" id="a" fill="#999"></path></g></svg> Viewports addon in the toolbar </div></section>',1))])}const h=L(a,[["render",x]]);a.__docgenInfo=Object.assign({displayName:a.name??a.__name},{displayName:"my-page",exportName:"default",description:"",tags:{},sourceFiles:["C:/Users/supoe/OneDrive/Bureau/Projets/ProjetsPerso/myMemoMaster/MyMemoMaster/my_memo_master_front/src/stories/Page.vue"]});const{expect:s,userEvent:M,within:T}=__STORYBOOK_MODULE_TEST__,P={title:"Example/Page",component:h,parameters:{layout:"fullscreen"}},t={},n={render:()=>({components:{MyPage:h},template:"<my-page />"}),play:async({canvasElement:c})=>{const e=T(c),o=e.getByRole("button",{name:/Log in/i});await s(o).toBeInTheDocument(),await M.click(o),await s(o).not.toBeInTheDocument();const i=e.getByRole("button",{name:/Log out/i});await s(i).toBeInTheDocument()}};var m,p,u;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:"{}",...(u=(p=t.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};var l,g,d;n.parameters={...n.parameters,docs:{...(l=n.parameters)==null?void 0:l.docs,source:{originalSource:`{
  render: () => ({
    components: {
      MyPage
    },
    template: '<my-page />'
  }),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const loginButton = canvas.getByRole('button', {
      name: /Log in/i
    });
    await expect(loginButton).toBeInTheDocument();
    await userEvent.click(loginButton);
    await expect(loginButton).not.toBeInTheDocument();
    const logoutButton = canvas.getByRole('button', {
      name: /Log out/i
    });
    await expect(logoutButton).toBeInTheDocument();
  }
}`,...(d=(g=n.parameters)==null?void 0:g.docs)==null?void 0:d.source}}};const V=["LoggedOut","LoggedIn"];export{n as LoggedIn,t as LoggedOut,V as __namedExportsOrder,P as default};
