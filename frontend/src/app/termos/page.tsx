import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/feature/LegalPage";

export const metadata: Metadata = {
    title: "Termos e Condições · Parqi",
    description: "Termos e condições de utilização da app e do site Parqi.",
    alternates: { canonical: "https://parqi.pt/termos" },
};

export default function Termos() {
    return (
        <LegalPage title="Termos e Condições" updated="10 de agosto de 2026">
            <p>
                Estes termos regulam a utilização da app Parqi e do site parqi.pt. Ao criar conta
                ou usar o Parqi, aceitas estes termos. Se não concordares, não uses o serviço.
            </p>

            <h2>1. O serviço</h2>
            <p>
                O Parqi é uma app comunitária e gratuita para encontrar estacionamento em Portugal.
                Junta dados públicos (câmaras municipais, OpenStreetMap, Geoapify) com contribuições
                da comunidade. A informação é indicativa: não garantimos que um lugar exista, esteja
                livre ou seja legal para estacionar num dado momento.
            </p>

            <h2>2. A tua conta</h2>
            <ul>
                <li>Precisas de ter pelo menos 16 anos para criar conta.</li>
                <li>Os dados de registo devem ser verdadeiros e o email tem de ser verificado.</li>
                <li>És responsável pelo que é feito com a tua conta. Uma conta por pessoa.</li>
            </ul>

            <h2>3. Regras da comunidade</h2>
            <p>Ao contribuir com lugares, edições ou votos, comprometes-te a:</p>
            <ul>
                <li>
                    <strong>Adicionar apenas lugares reais</strong>, em Portugal, onde é permitido
                    estacionar, com a posição o mais exata possível.
                </li>
                <li>
                    <strong>Não duplicar</strong> lugares que já existem no mapa; se algo estiver
                    errado, sugere uma edição em vez de criar um lugar novo.
                </li>
                <li>
                    <strong>Votar com honestidade</strong>: confirma só o que verificaste e reporta
                    com um motivo verdadeiro.
                </li>
                <li>
                    <strong>Não abusar</strong>: nada de spam, conteúdo ofensivo, dados falsos,
                    contas múltiplas para manipular votos, ou uso automatizado do serviço.
                </li>
            </ul>
            <p>
                As contribuições passam por validação automática e comunitária antes de serem
                verificadas, e existem limites diários de contribuições e votos. As primeiras
                contribuições de contas novas passam por revisão adicional.
            </p>

            <h2>4. As tuas contribuições</h2>
            <p>
                O conteúdo que submetes (lugares, descrições, votos) fica visível publicamente na
                app. Ao submeter, concedes ao Parqi uma licença mundial, gratuita e não exclusiva
                para usar, mostrar, adaptar e distribuir esse conteúdo no âmbito do serviço.
            </p>

            <h2>5. Moderação</h2>
            <p>
                Podemos rejeitar, editar ou remover conteúdo que viole estas regras, e suspender ou
                encerrar contas que abusem do serviço, sem aviso prévio. A pontuação de confiança e
                o estado de cada lugar são geridos pelo sistema e pela moderação, e podem mudar a
                qualquer momento.
            </p>

            <h2>6. Responsabilidade</h2>
            <p>
                Usa o Parqi por tua conta e risco. A sinalização e as regras de trânsito no local
                prevalecem sempre sobre a informação da app. Na medida permitida por lei, o Parqi
                não se responsabiliza por multas, reboques, danos ou perdas resultantes do uso da
                informação do serviço. Nunca uses a app enquanto conduzes.
            </p>

            <h2>7. Alterações</h2>
            <p>
                Podemos atualizar estes termos. Se a alteração for relevante, avisamos na app ou por
                email. Continuar a usar o serviço depois da alteração significa que a aceitas.
            </p>

            <h2>8. Lei aplicável e contacto</h2>
            <p>
                Estes termos regem-se pela lei portuguesa. Para qualquer questão, escreve para{" "}
                <a href="mailto:geral@parqi.pt">geral@parqi.pt</a>. Vê também a nossa{" "}
                <Link href="/privacidade">Política de Privacidade</Link>.
            </p>
        </LegalPage>
    );
}
