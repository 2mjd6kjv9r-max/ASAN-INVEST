using AsanInvest.Tests;

CatalogTests.Register();
ServiceTests.Register();
return Mini.Run(args.FirstOrDefault());
