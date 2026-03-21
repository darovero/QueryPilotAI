using System;
using System.Linq;
using System.Reflection;

class Program
{
    static void Main()
    {
        var path = @"C:\Users\Jessy\.nuget\packages\azure.ai.agents.persistent\1.2.0-beta.9\lib\net8.0\Azure.AI.Agents.Persistent.dll";
        var asm = Assembly.LoadFrom(path);
        foreach (var type in asm.GetExportedTypes())
        {
            if (type.Name.Contains("Client") || type.Name.Contains("Agent"))
            {
                Console.WriteLine($"\n--- Type: {type.FullName} ---");
                foreach (var method in type.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
                {
                    var parameters = string.Join(", ", method.GetParameters().Select(p => p.ParameterType.Name));
                    Console.WriteLine($"  {method.Name}({parameters})");
                }
            }
        }
    }
}
