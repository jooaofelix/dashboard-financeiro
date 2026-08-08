export const CHAVE_TEMA = "df:tema";

/**
 * Roda antes da primeira pintura: lê a preferência salva (ou a do sistema) e
 * marca o `data-theme` no `<html>`, evitando o flash de tema claro.
 */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("${CHAVE_TEMA}");if(t!=="dark"&&t!=="light"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
