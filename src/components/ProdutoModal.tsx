import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProdutores } from "@/hooks/useSupabaseData";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

const formSchema = z.object({
  segurado: z.string().min(1, "Campo obrigatório"),
  consultor: z.string().min(1, "Campo obrigatório"),
  data_registro: z.date({
    required_error: "Campo obrigatório",
  }),
  tipo: z.enum(["Coleta", "Indicação", "Novos CRM", "Visita/Video"], {
    required_error: "Campo obrigatório",
  }),
  observacao: z.string().optional(),
  // Campos condicionais - Indicação
  tipo_indicacao: z.enum(["Cliente", "Externa"]).optional(),
  clientes_indicados: z.array(z.object({
    nome: z.string(),
  })).optional(),
  // Campos condicionais - Visita/Video
  subtipo: z.enum(["Visita", "Vídeo"]).optional(),
  cidades: z.array(z.object({
    nome: z.string(),
  })).optional(),
  datas_realizadas: z.array(z.object({
    data: z.date(),
  })).optional(),
}).refine((data) => {
  // Se tipo é Indicação, tipo_indicacao é obrigatório
  if (data.tipo === "Indicação" && !data.tipo_indicacao) {
    return false;
  }
  // Se tipo é Visita/Video, subtipo é obrigatório
  if (data.tipo === "Visita/Video" && !data.subtipo) {
    return false;
  }
  return true;
}, {
  message: "Preencha todos os campos obrigatórios",
  path: ["tipo"],
});

type FormData = z.infer<typeof formSchema>;

interface ProdutoModalProps {
  isOpen: boolean;
  onClose: (shouldRefresh: boolean) => void;
  produto?: any | null;
}

export default function ProdutoModal({ isOpen, onClose, produto }: ProdutoModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { produtores } = useProdutores();
  const [clientes, setClientes] = useState<Array<{ id: string; segurado: string }>>([]);
  const [seguradoOpen, setSeguradoOpen] = useState(false);

  const produtoresAtivos = produtores.filter(p => p.ativo);

  // Fetch clientes
  useEffect(() => {
    const fetchClientes = async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, segurado")
        .eq("ativo", true)
        .order("segurado");
      
      if (!error && data) {
        setClientes(data);
      }
    };
    
    if (isOpen) {
      fetchClientes();
    }
  }, [isOpen]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      segurado: "",
      consultor: "",
      tipo: undefined,
      observacao: "",
      clientes_indicados: [{ nome: "" }],
      cidades: [{ nome: "" }],
      datas_realizadas: [{ data: new Date() }],
    },
  });

  const { fields: clientesFields, append: appendCliente, remove: removeCliente } = useFieldArray({
    control: form.control,
    name: "clientes_indicados",
  });

  const { fields: cidadesFields, append: appendCidade, remove: removeCidade } = useFieldArray({
    control: form.control,
    name: "cidades",
  });

  const { fields: datasFields, append: appendData, remove: removeData } = useFieldArray({
    control: form.control,
    name: "datas_realizadas",
  });

  const tipoValue = form.watch("tipo");
  const subtipoValue = form.watch("subtipo");
  const tipoIndicacaoValue = form.watch("tipo_indicacao");

  useEffect(() => {
    if (isOpen) {
      if (produto) {
        form.reset({
          segurado: produto.segurado || "",
          consultor: produto.consultor || "",
          data_registro: produto.data_registro ? new Date(produto.data_registro) : new Date(),
          tipo: produto.tipo,
          observacao: produto.observacao || "",
          tipo_indicacao: produto.tipo_indicacao || undefined,
          clientes_indicados: produto.cliente_indicado ? [{ nome: produto.cliente_indicado }] : [{ nome: "" }],
          subtipo: produto.subtipo || undefined,
          cidades: produto.cidade ? [{ nome: produto.cidade }] : [{ nome: "" }],
          datas_realizadas: produto.data_realizada ? [{ data: new Date(produto.data_realizada) }] : [{ data: new Date() }],
        });
      } else {
        form.reset({
          segurado: "",
          consultor: "",
          data_registro: new Date(),
          tipo: undefined,
          observacao: "",
          tipo_indicacao: undefined,
          clientes_indicados: [{ nome: "" }],
          subtipo: undefined,
          cidades: [{ nome: "" }],
          datas_realizadas: [{ data: new Date() }],
        });
      }
    }
  }, [isOpen, produto, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      // Find produtor name from ID
      const produtorSelecionado = produtoresAtivos.find(p => p.id === data.consultor);
      const consultorNome = produtorSelecionado?.nome || data.consultor;

      const produtosParaSalvar: any[] = [];

      // Campos condicionais - Indicação
      if (data.tipo === "Indicação" && data.clientes_indicados) {
        // Criar um registro para cada cliente indicado
        data.clientes_indicados.forEach(cliente => {
          if (cliente.nome.trim()) {
            produtosParaSalvar.push({
              segurado: data.segurado,
              consultor: consultorNome,
              data_registro: data.data_registro.toISOString(),
              tipo: data.tipo,
              observacao: data.observacao || null,
              tipo_indicacao: data.tipo_indicacao || null,
              cliente_indicado: cliente.nome,
              subtipo: null,
              cidade: null,
              data_realizada: null,
            });
          }
        });
      }
      // Campos condicionais - Visita/Video
      else if (data.tipo === "Visita/Video") {
        if (data.subtipo === "Visita" && data.cidades) {
          // Criar um registro para cada cidade
          data.cidades.forEach(cidade => {
            if (cidade.nome.trim()) {
              produtosParaSalvar.push({
                segurado: data.segurado,
                consultor: consultorNome,
                data_registro: data.data_registro.toISOString(),
                tipo: data.tipo,
                observacao: data.observacao || null,
                tipo_indicacao: null,
                cliente_indicado: null,
                subtipo: data.subtipo,
                cidade: cidade.nome,
                data_realizada: null,
              });
            }
          });
        } else if (data.subtipo === "Vídeo" && data.datas_realizadas) {
          // Criar um registro para cada data
          data.datas_realizadas.forEach(dataItem => {
            produtosParaSalvar.push({
              segurado: data.segurado,
              consultor: consultorNome,
              data_registro: data.data_registro.toISOString(),
              tipo: data.tipo,
              observacao: data.observacao || null,
              tipo_indicacao: null,
              cliente_indicado: null,
              subtipo: data.subtipo,
              cidade: null,
              data_realizada: dataItem.data.toISOString(),
            });
          });
        }
      }
      // Tipos sem campos múltiplos (Coleta, Novos CRM)
      else {
        produtosParaSalvar.push({
          segurado: data.segurado,
          consultor: consultorNome,
          data_registro: data.data_registro.toISOString(),
          tipo: data.tipo,
          observacao: data.observacao || null,
          tipo_indicacao: null,
          cliente_indicado: null,
          subtipo: null,
          cidade: null,
          data_realizada: null,
        });
      }

      if (produto) {
        // Update - mantém lógica antiga para edição
        const produtoData = produtosParaSalvar[0] || {};
        const { error } = await supabase
          .from("produtos")
          .update(produtoData)
          .eq("id", produto.id);

        if (error) throw error;

        toast({
          title: "Produto atualizado com sucesso",
        });
      } else {
        // Insert múltiplos registros
        if (produtosParaSalvar.length > 0) {
          const { error } = await supabase
            .from("produtos")
            .insert(produtosParaSalvar);

          if (error) throw error;

          toast({
            title: `${produtosParaSalvar.length} produto(s) criado(s) com sucesso`,
          });
        } else {
          toast({
            title: "Nenhum dado válido para salvar",
            variant: "destructive",
          });
          return;
        }
      }

      form.reset();
      onClose(true);
    } catch (error: any) {
      logger.error("Error saving produto:", error);
      toast({
        title: "Erro ao salvar produto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {produto ? "Editar Produto" : "Criar Novo Produto"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Segurado */}
            <FormField
              control={form.control}
              name="segurado"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Segurado *</FormLabel>
                  <Popover open={seguradoOpen} onOpenChange={setSeguradoOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value || "Selecione ou digite o segurado"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar ou digitar segurado..." 
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value.toUpperCase());
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="p-2 text-sm">
                              Nenhum cliente encontrado. Digite para adicionar: <span className="font-semibold">{field.value}</span>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {clientes.map((cliente) => (
                              <CommandItem
                                key={cliente.id}
                                value={cliente.segurado}
                                onSelect={(value) => {
                                  field.onChange(value.toUpperCase());
                                  setSeguradoOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    cliente.segurado === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {cliente.segurado}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Consultor */}
            <FormField
              control={form.control}
              name="consultor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consultor *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um consultor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {produtoresAtivos.map((produtor) => (
                        <SelectItem key={produtor.id} value={produtor.id}>
                          {produtor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data do Registro */}
            <FormField
              control={form.control}
              name="data_registro"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data do Registro *</FormLabel>
                  <FormControl>
                    <DatePickerInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo */}
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Coleta">Coleta</SelectItem>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="Novos CRM">Novos CRM</SelectItem>
                      <SelectItem value="Visita/Video">Visita/Video</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos condicionais - Indicação */}
            {tipoValue === "Indicação" && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                <FormField
                  control={form.control}
                  name="tipo_indicacao"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Indicação</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Cliente" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Indicação Cliente
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Externa" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Indicação Externa
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {tipoIndicacaoValue && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel>Clientes Indicados</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendCliente({ nome: "" })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    {clientesFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <FormField
                          control={form.control}
                          name={`clientes_indicados.${index}.nome`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input 
                                  placeholder="Nome do cliente indicado" 
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {clientesFields.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeCliente(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Campos condicionais - Visita/Video */}
            {tipoValue === "Visita/Video" && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                <FormField
                  control={form.control}
                  name="subtipo"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Subtipo</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Visita" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Visita
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Vídeo" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Vídeo
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {subtipoValue === "Visita" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel>Cidades</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendCidade({ nome: "" })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    {cidadesFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <FormField
                          control={form.control}
                          name={`cidades.${index}.nome`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input 
                                  placeholder="Nome da cidade" 
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {cidadesFields.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeCidade(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {subtipoValue === "Vídeo" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel>Datas Realizadas</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendData({ data: new Date() })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    {datasFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <FormField
                          control={form.control}
                          name={`datas_realizadas.${index}.data`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <DatePickerInput
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {datasFields.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeData(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Observação */}
            <FormField
              control={form.control}
              name="observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : produto ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}