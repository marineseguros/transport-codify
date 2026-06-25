// Edge Function: import-realizado-premio
// Recebe linhas já parseadas do .xlsx e grava em realizado_premio.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface IncomingRow {
  inicio_vigencia: string; // YYYY-MM-DD
  seguradora_nome?: string | null;
  ramo_nome?: string | null;
  cnpj?: string | null;
  valor_premio: number;
  produtores: { nome: string; tipo: string }[];
}

interface Payload {
  ano: number;
  arquivo_nome?: string;
  linhas: IncomingRow[];
}

// Modo fixo no servidor: sempre substitui o realizado do ano para evitar
// duplicidade. A primeira importação não tem nada para substituir, então
// o efeito prático é apenas inserir os dados "crus".
const MODO_FIXO = "substituir" as const;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client to identify user
    const authClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify admin role
    const { data: profile } = await admin
      .from("profiles")
      .select("papel, ativo")
      .eq("user_id", userId)
      .maybeSingle();

    if (
      !profile?.ativo ||
      !["Administrador", "Gerente", "CEO"].includes(profile.papel)
    ) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Payload;
    if (!payload?.ano || !Array.isArray(payload.linhas)) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega produtores e ramos para matching
    const [{ data: produtores }, { data: ramos }] = await Promise.all([
      admin.from("produtores").select("id, nome, email"),
      admin.from("ramos").select("id, descricao, ramo_agrupado"),
    ]);

    const produtorByName = new Map<string, string>();
    (produtores || []).forEach((p: any) => {
      produtorByName.set(norm(p.nome), p.id);
    });
    const ramoByName = new Map<
      string,
      { agrupado: string | null; descricao: string }
    >();
    (ramos || []).forEach((r: any) => {
      ramoByName.set(norm(r.descricao), {
        agrupado: r.ramo_agrupado,
        descricao: r.descricao,
      });
    });

    // Cria cabeçalho da importação
    const totalValor = payload.linhas.reduce(
      (s, r) =>
        s +
        (Number(r.valor_premio) || 0) *
          (r.produtores?.filter((p) => p.nome).length || 0),
      0,
    );

    const { data: importHeader, error: hErr } = await admin
      .from("realizado_premio_importacoes")
      .insert({
        ano: payload.ano,
        arquivo_nome: payload.arquivo_nome ?? null,
        linhas_processadas: payload.linhas.length,
        total_valor: totalValor,
        modo: MODO_FIXO,
        importado_por: userId,
      })
      .select("id")
      .single();

    if (hErr || !importHeader) {
      return new Response(
        JSON.stringify({ error: "Erro criando importação", detail: hErr }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Substituir SEMPRE: apaga linhas + importações antigas do mesmo ano.
    // Afeta apenas as tabelas de realizado — cotações, metas e demais
    // dados da plataforma permanecem intactos.
    await admin
      .from("realizado_premio")
      .delete()
      .eq("ano", payload.ano)
      .neq("importacao_id", importHeader.id);
    await admin
      .from("realizado_premio_importacoes")
      .delete()
      .eq("ano", payload.ano)
      .neq("id", importHeader.id);

    // Expande linhas (uma por produtor preenchido)
    const inserts: any[] = [];
    const warnings: { produtoresNaoEncontrados: Set<string>; ramosNaoEncontrados: Set<string> } = {
      produtoresNaoEncontrados: new Set(),
      ramosNaoEncontrados: new Set(),
    };

    for (const row of payload.linhas) {
      if (!row.inicio_vigencia) continue;
      const date = new Date(row.inicio_vigencia + "T00:00:00");
      if (isNaN(date.getTime())) continue;
      if (date.getFullYear() !== payload.ano) continue;
      const mes = date.getMonth() + 1;
      const ramoInfo = row.ramo_nome ? ramoByName.get(norm(row.ramo_nome)) : null;
      if (row.ramo_nome && !ramoInfo) warnings.ramosNaoEncontrados.add(row.ramo_nome);

      for (const p of row.produtores || []) {
        if (!p?.nome) continue;
        const pid = produtorByName.get(norm(p.nome));
        if (!pid) warnings.produtoresNaoEncontrados.add(p.nome);
        inserts.push({
          importacao_id: importHeader.id,
          ano: payload.ano,
          mes,
          inicio_vigencia: row.inicio_vigencia,
          seguradora_nome: row.seguradora_nome ?? null,
          ramo_nome: row.ramo_nome ?? null,
          ramo_agrupado: ramoInfo?.agrupado ?? null,
          cnpj: row.cnpj ?? null,
          valor_premio: Number(row.valor_premio) || 0,
          produtor_nome: p.nome,
          produtor_id: pid ?? null,
          tipo_produtor: p.tipo,
        });
      }
    }

    // Insere em chunks
    const chunkSize = 500;
    for (let i = 0; i < inserts.length; i += chunkSize) {
      const chunk = inserts.slice(i, i + chunkSize);
      const { error: insErr } = await admin
        .from("realizado_premio")
        .insert(chunk);
      if (insErr) {
        return new Response(
          JSON.stringify({
            error: "Erro inserindo linhas",
            detail: insErr,
            inseridas: i,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        importacao_id: importHeader.id,
        linhas_inseridas: inserts.length,
        produtores_nao_encontrados: Array.from(warnings.produtoresNaoEncontrados),
        ramos_nao_encontrados: Array.from(warnings.ramosNaoEncontrados),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e?.message ?? e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
