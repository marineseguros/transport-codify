import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  cliente_indicado: z.string().optional(),
  // Campos condicionais - Visita/Video
  subtipo: z.enum(["Visita", "Vídeo"]).optional(),
  cidade: z.string().optional(),
  data_realizada: z.date().optional(),
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      segurado: "",
      consultor: "",
      tipo: undefined,
      observacao: "",
    },
  });

  const tipoValue = form.watch("tipo");
  const subtipoValue = form.watch("subtipo");
  const tipoIndicacaoValue = form.watch("tipo_indicacao");

  useEffect(() => {
    if (produto) {
      form.reset({
        segurado: produto.segurado || "",
        consultor: produto.consultor || "",
        data_registro: produto.data_registro ? new Date(produto.data_registro) : new Date(),
        tipo: produto.tipo,
        observacao: produto.observacao || "",
        tipo_indicacao: produto.tipo_indicacao || undefined,
        cliente_indicado: produto.cliente_indicado || "",
        subtipo: produto.subtipo || undefined,
        cidade: produto.cidade || "",
        data_realizada: produto.data_realizada ? new Date(produto.data_realizada) : undefined,
      });
    } else {
      form.reset({
        segurado: "",
        consultor: "",
        data_registro: new Date(),
        tipo: undefined,
        observacao: "",
        tipo_indicacao: undefined,
        cliente_indicado: "",
        subtipo: undefined,
        cidade: "",
        data_realizada: undefined,
      });
    }
  }, [produto, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      const produtoData: any = {
        segurado: data.segurado,
        consultor: data.consultor,
        data_registro: data.data_registro.toISOString(),
        tipo: data.tipo,
        observacao: data.observacao || null,
      };

      // Campos condicionais - Indicação
      if (data.tipo === "Indicação") {
        produtoData.tipo_indicacao = data.tipo_indicacao || null;
        produtoData.cliente_indicado = data.cliente_indicado || null;
      } else {
        produtoData.tipo_indicacao = null;
        produtoData.cliente_indicado = null;
      }

      // Campos condicionais - Visita/Video
      if (data.tipo === "Visita/Video") {
        produtoData.subtipo = data.subtipo || null;
        if (data.subtipo === "Visita") {
          produtoData.cidade = data.cidade || null;
          produtoData.data_realizada = null;
        } else if (data.subtipo === "Vídeo") {
          produtoData.data_realizada = data.data_realizada?.toISOString() || null;
          produtoData.cidade = null;
        }
      } else {
        produtoData.subtipo = null;
        produtoData.cidade = null;
        produtoData.data_realizada = null;
      }

      if (produto) {
        // Update
        const { error } = await supabase
          .from("produtos")
          .update(produtoData)
          .eq("id", produto.id);

        if (error) throw error;

        toast({
          title: "Produto atualizado com sucesso",
        });
      } else {
        // Insert
        const { error } = await supabase
          .from("produtos")
          .insert([produtoData]);

        if (error) throw error;

        toast({
          title: "Produto criado com sucesso",
        });
      }

      onClose(true);
    } catch (error: any) {
      console.error("Error saving produto:", error);
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
                <FormItem>
                  <FormLabel>Segurado *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do segurado" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input placeholder="Nome do consultor" {...field} />
                  </FormControl>
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
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
                  <FormField
                    control={form.control}
                    name="cliente_indicado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente Indicado</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do cliente indicado" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {subtipoValue === "Vídeo" && (
                  <FormField
                    control={form.control}
                    name="data_realizada"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Realizada</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy")
                                ) : (
                                  <span>Selecione uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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