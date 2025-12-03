import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data, totals } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "open-quotes") {
      systemPrompt = `Você é um analista comercial especializado em seguros. Analise os dados de cotações em aberto e forneça insights acionáveis em português brasileiro. Use emojis comerciais e formatação clara.`;
      
      userPrompt = `Analise estas cotações em aberto e forneça EXATAMENTE 2 ou 3 insights comerciais.

DADOS:
- Total Recorrente: R$ ${totals.recorrente?.toLocaleString('pt-BR') || 0}
- Total Avulso: R$ ${totals.total?.toLocaleString('pt-BR') || 0}
- Segurados: ${totals.segurados || 0}

TOP SEGURADOS:
${JSON.stringify(data.slice(0, 10), null, 2)}

FORMATO OBRIGATÓRIO (use exatamente este formato):

📊 **Maior Potencial**
[1 frase curta sobre o cliente com maior valor]

🎯 **Foco Comercial**
[1 frase curta sobre onde concentrar esforços]

⚠️ **Atenção**
[1 frase curta sobre cotações antigas ou riscos - opcional]

REGRAS:
- Use EXATAMENTE os emojis e títulos em negrito (**texto**)
- Cada insight deve ter NO MÁXIMO 1 linha
- Seja direto e comercial
- Pule uma linha entre cada insight`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices?.[0]?.message?.content || "Não foi possível gerar análise.";

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-analysis:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
