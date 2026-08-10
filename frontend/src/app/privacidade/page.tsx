import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/feature/LegalPage";

export const metadata: Metadata = {
    title: "Política de Privacidade · Parqi",
    description: "Como o Parqi recolhe, usa e protege os teus dados pessoais.",
    alternates: { canonical: "https://parqi.pt/privacidade" },
};

export default function Privacidade() {
    return (
        <LegalPage title="Política de Privacidade" updated="10 de agosto de 2026">
            <p>
                Esta política explica que dados pessoais o Parqi recolhe, para quê, e que direitos
                tens sobre eles, nos termos do Regulamento Geral de Proteção de Dados (RGPD).
            </p>

            <h2>1. Responsável pelo tratamento</h2>
            <p>
                O responsável pelo tratamento dos teus dados é o Parqi. Para qualquer assunto de
                privacidade, contacta <a href="mailto:geral@parqi.pt">geral@parqi.pt</a>.
            </p>

            <h2>2. Dados que recolhemos</h2>
            <ul>
                <li>
                    <strong>Conta</strong>: nome, email e palavra-passe (guardada apenas de forma
                    cifrada, nunca em texto simples).
                </li>
                <li>
                    <strong>Contribuições e votos</strong>: os lugares que adicionas ou editas
                    (incluindo a localização que desenhas no mapa), os teus votos e os motivos de
                    reporte. Este conteúdo é público na app.
                </li>
                <li>
                    <strong>Registos técnicos</strong>: endereço IP e dados de pedido em logs do
                    servidor, usados para segurança e prevenção de abuso, guardados por período
                    limitado.
                </li>
            </ul>
            <p>
                A localização do teu dispositivo é usada apenas na app, para centrar o mapa perto de
                ti. Não guardamos o histórico da tua localização nos nossos servidores.
            </p>

            <h2>3. Para que usamos os dados</h2>
            <ul>
                <li>
                    <strong>Prestar o serviço</strong> (base legal: execução do contrato) — conta,
                    verificação de email, contribuições, votos e estatísticas de reputação.
                </li>
                <li>
                    <strong>Segurança e anti-abuso</strong> (base legal: interesse legítimo) —
                    limites de utilização, deteção de spam e moderação.
                </li>
                <li>
                    <strong>Comunicações essenciais</strong> — emails de verificação e avisos sobre a
                    tua conta. Não enviamos marketing.
                </li>
            </ul>

            <h2>4. Com quem partilhamos</h2>
            <p>
                Não vendemos os teus dados. Partilhamos apenas com fornecedores que precisamos para
                operar o serviço (alojamento e envio de email), vinculados por contrato, e com
                autoridades quando a lei o exigir. As contribuições e votos são públicos por
                natureza, mas o teu email nunca é mostrado a outros utilizadores.
            </p>

            <h2>5. Quanto tempo guardamos</h2>
            <p>
                Guardamos os dados da conta enquanto ela existir. Se eliminares a conta, removemos
                os teus dados pessoais; as contribuições já validadas podem ser mantidas de forma
                anonimizada, para não degradar o mapa da comunidade.
            </p>

            <h2>6. Os teus direitos</h2>
            <p>
                Podes pedir acesso, retificação, eliminação, portabilidade, limitação ou opor-te ao
                tratamento dos teus dados, escrevendo para{" "}
                <a href="mailto:geral@parqi.pt">geral@parqi.pt</a>. Tens também o direito de apresentar
                queixa à CNPD (<a href="https://www.cnpd.pt">cnpd.pt</a>).
            </p>

            <h2>7. Segurança</h2>
            <p>
                Usamos medidas técnicas adequadas: palavras-passe cifradas, ligações HTTPS, controlo
                de acessos e registos de moderação. Nenhum sistema é infalível, mas levamos a
                proteção dos teus dados a sério.
            </p>

            <h2>8. Alterações</h2>
            <p>
                Se esta política mudar de forma relevante (por exemplo, se o serviço passar a ter
                publicidade), avisamos na app ou por email antes de a alteração entrar em vigor.
            </p>

            <p>
                Vê também os <Link href="/termos">Termos e Condições</Link>.
            </p>
        </LegalPage>
    );
}
